import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("railway_reservation.db");

// Initialize Database Schema
function initDB() {
  db.exec(`
    -- Create Passengers table
    CREATE TABLE IF NOT EXISTS Passengers (
      PassengerID INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Age INTEGER CHECK(Age > 0),
      Gender TEXT CHECK(Gender IN ('Male', 'Female', 'Other')),
      Phone TEXT UNIQUE NOT NULL,
      Email TEXT UNIQUE NOT NULL
    );

    -- Create Trains table
    CREATE TABLE IF NOT EXISTS Trains (
      TrainID INTEGER PRIMARY KEY AUTOINCREMENT,
      TrainName TEXT NOT NULL,
      Source TEXT NOT NULL,
      Destination TEXT NOT NULL,
      TotalSeats INTEGER NOT NULL,
      AvailableSeats INTEGER NOT NULL CHECK(AvailableSeats >= 0 AND AvailableSeats <= TotalSeats),
      BaseFare DECIMAL(10, 2) DEFAULT 0.00
    );

    -- Create Bookings table
    CREATE TABLE IF NOT EXISTS Bookings (
      BookingID INTEGER PRIMARY KEY AUTOINCREMENT,
      PassengerID INTEGER NOT NULL,
      TrainID INTEGER NOT NULL,
      BookingDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      SeatNumber INTEGER NOT NULL,
      Status TEXT DEFAULT 'Confirmed',
      PNR TEXT UNIQUE NOT NULL,
      FOREIGN KEY (PassengerID) REFERENCES Passengers(PassengerID),
      FOREIGN KEY (TrainID) REFERENCES Trains(TrainID)
    );

    -- Create Payments table
    CREATE TABLE IF NOT EXISTS Payments (
      PaymentID INTEGER PRIMARY KEY AUTOINCREMENT,
      BookingID INTEGER NOT NULL,
      Amount DECIMAL(10, 2) NOT NULL,
      PaymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      PaymentStatus TEXT DEFAULT 'Completed',
      FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID)
    );

    -- Create Admin table
    CREATE TABLE IF NOT EXISTS Admin (
      AdminID INTEGER PRIMARY KEY AUTOINCREMENT,
      Username TEXT UNIQUE NOT NULL,
      Password TEXT NOT NULL
    );

    -- Index for faster train search
    CREATE INDEX IF NOT EXISTS idx_train_route ON Trains (Source, Destination);
    CREATE INDEX IF NOT EXISTS idx_train_name ON Trains (TrainName);

    -- View to show available trains
    CREATE VIEW IF NOT EXISTS AvailableTrainsView AS
    SELECT * FROM Trains WHERE AvailableSeats > 0;

    -- Trigger: Decrease AvailableSeats on new booking
    CREATE TRIGGER IF NOT EXISTS decrease_seats
    AFTER INSERT ON Bookings
    BEGIN
      UPDATE Trains 
      SET AvailableSeats = AvailableSeats - 1
      WHERE TrainID = NEW.TrainID;
    END;

    -- Trigger: Increase AvailableSeats on booking cancellation
    CREATE TRIGGER IF NOT EXISTS increase_seats
    AFTER UPDATE OF Status ON Bookings
    WHEN NEW.Status = 'Cancelled' AND OLD.Status = 'Confirmed'
    BEGIN
      UPDATE Trains 
      SET AvailableSeats = AvailableSeats + 1
      WHERE TrainID = OLD.TrainID;
    END;
  `);

  // Seed sample data if empty
  const trainCount = db.prepare("SELECT COUNT(*) as count FROM Trains").get() as any;
  if (trainCount.count === 0) {
    const trains = [
      ["Rajdhani Express", "Delhi", "Mumbai", 100, 100, 2500.00],
      ["Shatabdi Express", "Delhi", "Chandigarh", 50, 50, 1200.00],
      ["Duronto Express", "Kolkata", "Delhi", 80, 80, 2200.00],
      ["Bhopal Shatabdi", "Delhi", "Bhopal", 60, 60, 1500.00],
      ["Tejas Express", "Mumbai", "Goa", 40, 40, 3000.00],
      ["Gatimaan Express", "Delhi", "Agra", 30, 30, 800.00],
      ["Vande Bharat", "Delhi", "Varanasi", 70, 70, 2800.00],
      ["Garib Rath", "Chennai", "Bangalore", 120, 120, 600.00],
      ["Deccan Queen", "Mumbai", "Pune", 50, 50, 400.00],
      ["Hifz Express", "Lucknow", "Delhi", 90, 90, 750.00]
    ];

    const insertTrain = db.prepare("INSERT INTO Trains (TrainName, Source, Destination, TotalSeats, AvailableSeats, BaseFare) VALUES (?, ?, ?, ?, ?, ?)");
    trains.forEach(t => insertTrain.run(...t));
    
    db.prepare("INSERT INTO Admin (Username, Password) VALUES (?, ?)").run("admin", "admin123");
  }
}

initDB();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  
  // 1. Get all trains
  app.get("/api/trains", (req, res) => {
    const trains = db.prepare("SELECT * FROM Trains").all();
    res.json(trains);
  });

  // 2. Search trains
  app.get("/api/search", (req, res) => {
    const { source, destination } = req.query;
    const trains = db.prepare("SELECT * FROM Trains WHERE Source LIKE ? AND Destination LIKE ?").all(`%${source}%`, `%${destination}%`);
    res.json(trains);
  });

  // 3. Get available trains (using View)
  app.get("/api/available-trains", (req, res) => {
    const trains = db.prepare("SELECT * FROM AvailableTrainsView").all();
    res.json(trains);
  });

  // 4. Book a ticket (Complex logic with Transaction)
  app.post("/api/book", (req, res) => {
    const { name, age, gender, phone, email, trainId } = req.body;
    
    try {
      const transaction = db.transaction(() => {
        // Find or create passenger
        let passenger = db.prepare("SELECT PassengerID FROM Passengers WHERE Phone = ?").get(phone) as any;
        if (!passenger) {
          const info = db.prepare("INSERT INTO Passengers (Name, Age, Gender, Phone, Email) VALUES (?, ?, ?, ?, ?)").run(name, age, gender, phone, email);
          passenger = { PassengerID: info.lastInsertRowid };
        }

        // Check availability
        const train = db.prepare("SELECT AvailableSeats, TotalSeats, BaseFare FROM Trains WHERE TrainID = ?").get(trainId) as any;
        if (!train) throw new Error("Train not found");

        let status = "Confirmed";
        let seatNumber = 0;
        let pnr = Math.random().toString(36).substring(2, 10).toUpperCase();

        if (train.AvailableSeats <= 0) {
          // Waiting List Logic
          const wlCount = db.prepare("SELECT COUNT(*) as count FROM Bookings WHERE TrainID = ? AND Status LIKE 'WL-%'").get(trainId) as any;
          status = `WL-${wlCount.count + 1}`;
          seatNumber = 0; // No seat for WL
        } else {
          seatNumber = train.TotalSeats - train.AvailableSeats + 1;
        }

        // Create booking
        const bookingInfo = db.prepare("INSERT INTO Bookings (PassengerID, TrainID, SeatNumber, Status, PNR) VALUES (?, ?, ?, ?, ?)").run(passenger.PassengerID, trainId, seatNumber, status, pnr);
        const bookingId = bookingInfo.lastInsertRowid;

        // Record Payment
        db.prepare("INSERT INTO Payments (BookingID, Amount) VALUES (?, ?)").run(bookingId, train.BaseFare);
        
        return { passengerId: passenger.PassengerID, seatNumber, pnr, amount: train.BaseFare, status };
      });

      const result = transaction();
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 5. Cancel ticket
  app.post("/api/cancel", (req, res) => {
    const { pnr } = req.body;
    try {
      db.prepare("UPDATE Bookings SET Status = 'Cancelled' WHERE PNR = ? AND Status = 'Confirmed'").run(pnr);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 6. View booking details by PNR or phone
  app.get("/api/bookings/:id", (req, res) => {
    const { id } = req.params;
    let bookings;
    // Check if ID is likely a PNR (alphanumeric length 8) or Phone
    const isPNR = id.length === 8 && /^[A-Z0-9]+$/.test(id);
    
    if (isPNR) {
       bookings = db.prepare(`
        SELECT b.BookingID, b.BookingDate, b.SeatNumber, b.Status, b.PNR, t.TrainName, t.Source, t.Destination, pay.Amount, pay.PaymentStatus
        FROM Bookings b
        JOIN Trains t ON b.TrainID = t.TrainID
        LEFT JOIN Payments pay ON b.BookingID = pay.BookingID
        WHERE b.PNR = ?
      `).all(id);
    } else {
      bookings = db.prepare(`
        SELECT b.BookingID, b.BookingDate, b.SeatNumber, b.Status, b.PNR, t.TrainName, t.Source, t.Destination, pay.Amount, pay.PaymentStatus
        FROM Bookings b
        JOIN Trains t ON b.TrainID = t.TrainID
        JOIN Passengers p ON b.PassengerID = p.PassengerID
        LEFT JOIN Payments pay ON b.BookingID = pay.BookingID
        WHERE p.Phone = ?
        ORDER BY b.BookingDate DESC
      `).all(id);
    }
    res.json(bookings);
  });

  // Admin login
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    const admin = db.prepare("SELECT * FROM Admin WHERE Username = ? AND Password = ?").get(username, password);
    if (admin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
