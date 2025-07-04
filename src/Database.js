import {DatabaseSync} from 'node:sqlite';

export const database = new DatabaseSync("db.sqlite");

// create all tables needed
database.exec(`
    CREATE TABLE IF NOT EXISTS lol_matches
    (
        id             INTEGER PRIMARY KEY,
        lol_id         TEXT                           NOT NULL,
        match_id       TEXT                           NOT NULL,
        winloss        INTEGER                        NOT NULL,
        game_timestamp INTEGER                        NOT NULL,
        game_length    INTEGER                        NOT NULL,
        timestamp      TEXT DEFAULT (datetime('now')) NOT NULL
    ) STRICT
`);

database.exec(`
    CREATE TABLE IF NOT EXISTS lol_elo
    (
        id        INTEGER PRIMARY KEY,
        rank      TEXT                           NOT NULL,
        points    INTEGER                        NOT NULL,
        tier      TEXT                           NOT NULL,
        timestamp TEXT DEFAULT (datetime('now')) NOT NULL
    ) STRICT
`);

database.exec(`
    CREATE TABLE IF NOT EXISTS alerts
    (
        id        INTEGER PRIMARY KEY,
        alert     TEXT                              NOT NULL,
        time_sent TEXT    DEFAULT (datetime('now')) NOT NULL,
        processed INTEGER DEFAULT 0                 NOT NULL
    ) STRICT
`);

