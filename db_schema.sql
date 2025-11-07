-- Enable foreign key constraints
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- Create the organisers table
CREATE TABLE IF NOT EXISTS organisers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Unique identifier for each organiser
    username TEXT UNIQUE NOT NULL,         -- Username, must be unique and not null
    password TEXT NOT NULL,                -- Password, cannot be null
    created_at TEXT DEFAULT (datetime('now'))  -- Timestamp of creation, defaults to current date and time
);

-- Create the events table
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Unique identifier for each event
    name TEXT NOT NULL,                    -- Event name, cannot be null
    description TEXT,                      -- Description of the event
    date TEXT NOT NULL,                    -- Event date, cannot be null
    artist TEXT NOT NULL,                  -- Artist performing at the event, cannot be null
    status TEXT NOT NULL,                  -- Status of the event, cannot be null
    full_price_tickets INTEGER DEFAULT 0,  -- Number of full price tickets, defaults to 0
    full_price REAL DEFAULT 0.0,           -- Price of a full price ticket, defaults to 0.0
    concession_tickets INTEGER DEFAULT 0,  -- Number of concession tickets, defaults to 0
    concession_price REAL DEFAULT 0.0,     -- Price of a concession ticket, defaults to 0.0
    last_modified TEXT DEFAULT (datetime('now')),  -- Timestamp of last modification, defaults to current date and time
    published_at TEXT                      -- Timestamp when the event was published
);

-- Create the bookings table with full_price_quantity and concession_quantity
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Unique identifier for each booking
    event_id INTEGER NOT NULL,             -- ID of the event being booked, cannot be null
    attendee_name TEXT NOT NULL,           -- Name of the attendee, cannot be null
    full_price_quantity INTEGER DEFAULT 0, -- Number of full price tickets booked, defaults to 0
    concession_quantity INTEGER DEFAULT 0, -- Number of concession tickets booked, defaults to 0
    booking_date TEXT NOT NULL,            -- Date of booking, cannot be null
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE  -- Foreign key referencing the events table, cascades on delete
);

-- Create the site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
    artist TEXT PRIMARY KEY,               -- Unique identifier for each artist
    name TEXT NOT NULL,                    -- Name of the artist, cannot be null
    description TEXT NOT NULL              -- Description of the artist, cannot be null
);

COMMIT;
