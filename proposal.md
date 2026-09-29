# Final Project Proposal
## Team Members
Teagan Tran, Ryan Carignan, Owen Matthews, Avikshit Pal
## Description
Our goal for this project is to build a web-based, top-down ‘vampire survivors’-like game. Users will first create an account (username and password), or log in to their existing account, and be brought to a page that shows the leaderboard of scores with an option to start the game.
Upon game start, the user will control a character placed in a large open map with the goal of surviving waves of enemies. The player can move, aim, and fire their weapon to defeat enemies. Enemies will spawn at the edge of the world and attempt to pursue the player. Defeating enemies will award the player XP, which, at certain thresholds, will level up the player, allowing them to choose one of multiple abilities to acquire for the remainder of the game. Each wave of abilities will be stronger and more numerous. 
To create this project we will use an Express backend connected to a MongoDB database. The frontend outside of the game window will be relatively simple and thus will not require a framework, just HTML, CSS, and TypeScript pages. The game will be rendered using PixiJS. We chose this because it provides high-performance, simple-to-use, 2D rendering capabilities which is perfect for our project.
Some stretch goals to enhance the project if time allows are as follows: add bosses with their own unique movements, add different types of enemies, add different playable characters with unique passive abilities, add different weapons to use to allow for different playstyles. Another potential improvement is to add gold as another resource type. In this case, a shop would be added, which could be opened at any time to allow the player to buy abilities using gold or refresh the options listed for a fee. 



## Changes
We have moved away from PixiJS to Kaplay 