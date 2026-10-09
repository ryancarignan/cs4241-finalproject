# Final Project
*Due October 9th by 1:59 PM*

#### Project Description

Our group created a browser-based survival game inspired by Vampire Survivors, using a slime character that automatically shoots at incoming enemies while the player moves around the arena. The goal is to survive as long as possible, collect XP, level up, unlock upgrades, and fight increasingly difficult waves that culminate in a boss encounter. The project combines fast arcade gameplay with progression systems, making it feel like a compact roguelite survival experience built for a single-session playthrough.

<img width="1664" height="1246" alt="Screen Recording 2026-10-08 232416" src="https://github.com/user-attachments/assets/39c3ebc6-694c-434c-b676-ebaecfa02ab6" />

The game is designed to be simple and replayable. It features enemies spawning continuously, a leveling system that encourages strategic upgrades, and a leaderboard that tracks top scores. We also included a login capability so users can create or sign into an account and have their score stored in MongoDB, creating a more complete game experience than a simple offline prototype.

Project Link: https://auto-shooter.onrender.com/

#### Additional Instructions
You will need to create login credentials using the homepage of the application.

#### Technologies Used
- Kaplay - This is the game engine used to render the game world, handle player movement, sprites, collisions, projectiles, enemy spawning, boss mechanics, and the overall arcade gameplay loop. It was used to build the actual survival game experience in the browser.
- JavaScript - The game logic and UI behavior were implemented in JavaScript, including shooting, XP collection, leveling, upgrade application, boss AI, pause states, and the game loop. It's also responsible for the front-end interactions for the login and leaderboard screens.
- Node.js + Express - A lightweight Express server serves the project, handles HTTP requests, and manages routes for login, logout, and storing player scores. It serves as the backend side of the app and static game files.
- MongoDB - MongoDB Atlas stores user account information and saved scores. The database is used to keep track of usernames, passwords, and leaderboard data so players can log in and compare scores.
- cookie-session + dotenv - cookie-session stores the user session information after login so the app can verify that a player is authenticated while playing. dotenv loads environment variables such as database credentials so the server can connect securely to MongoDB.

#### Challenges Faced
- Kaplay is a new game engine to most of the group, introducing another layer of complexity in coding this project as we'd need to include research not present in the writing of the game's javascript.
- The short time frame made it difficult to accomodate everyone's schedule when discussing potential implementations of features from the ideation phase, as people were not always active at the same time.

#### Group Roles
Avi - Base game and Boss development
Owen - Backend mongoDB integration and login page
Ryan - XP collection and leveling system
Teagan - Upgrade system and level integration

#### Video Link
https://youtu.be/4E59nRcYgb8
