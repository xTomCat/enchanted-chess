# Enchanted Chess

Real-time 3D chess variant featuring spell mechanics, online multiplayer, and an AI opponent.

**Play the game for free: [enchantedchess.xtomc.at](https://enchantedchess.xtomc.at/)**



https://github.com/user-attachments/assets/e9d5fef7-5022-4021-8dca-0bb2ee5a30ea

## What is this?
This is my Computer Science A-Level NEA coursework, started in May 2024.
It's like chess, but you collect Energy by taking your opponent's pieces. This can be spent to cast Spell cards on the board, triggering unique effects!
You can play it in either singleplayer mode or online, against a friend!

## Features
- Real-time online multiplayer with Socket.io rooms, featuring instant invite links.
- Four playable Spell cards
- Single-player mode versus AI (Minimax of depth 3)
- Card gallery, options screen, and board flavors!
- Hand-built UI and animations system
- No build step, framework, or accounts system: just open the webpage and [start playing!](https://enchantedchess.xtomc.at/)

## Stack
- Frontend: Vanilla JavaScript, p5.js, gl-matrix
- Backend: Node.js, Socket.io, Express, Docker

## How it works
- Authoritative server handling game state, socket.io rooms, move validation, etc.
- Some scripts are shared: shared/pieceMovement.js, for instance. These are loaded by both the client and server to prevent any drift.
- UI is handled by a hand-written GUI/buffer system in public/graphicsBuffers.js.
- ~4,100 lines of clientside JavaScript across 10 files.

## Running it yourself

```bash
npm install
npm start # http://localhost:3000, Node 20+
```

```bash
docker compose up # binds 127.0.0.1:3000, override with BIND_ADDR / BIND_PORT
```

## Notes
Since the original coursework project, I made multiple improvements to the game - most notably, I added three new Spell cards, Singleplayer mode, added the Options + Card Deck menu, as well as lots of code cleanups, bugfixes, and enhancements. 

I made significant performance improvements aimed towards Firefox, as previously it struggled in framerate in that context. For example, I baked the chessboard into a single mesh rather than rendering each tile individually, I converted many p5.Graphics textures to p5.Images to prevent re-uploading to the GPU on every frame, and made pieces share textures instead of having their own individual ones.

Originally, I envisioned this project having many more features. For example:
- A much bigger card deck, with randomized Spell card draws
- Automated online matchmaking
- Sound effects
- An elo/sbmm system
- Automated tests
These never came to fruition thanks to time constraints. Maybe, in the future, I'll work on them!

## Credits
- Libraries used: P5.js, gl-matrix, socket.io, Express
- Bubblegum Sans (SIL Open Font License)
- Chess piece models, card art and title art are handmade

## Licence

MIT - see [LICENSE](LICENSE).
