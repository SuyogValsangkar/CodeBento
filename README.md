# CodeBento
Compact in form. Simple in design. Rich in content.

CodeBento - A lightweight, clean, powerful web notebook for writing and running code instantly.

## Architecture
- Frontend: React + Vite
- Backend API: Fastify
- Execution Runner: WebAssembly
- Orchestration: SpinKube (K8s)

## Version History  
0.0 Early development
- Initial monorepo setup

1.0 Minimum Viable Product
- Code runs in sandboxed spin instance
- Std Input and Std Output both work
- Minimal but working UI

1.1 Support for interactive sessions
- Program 'waits' for user input
- Multiple input statements supported
- Intput validation, and robust error handling

## Getting Started
Start up the web-assmebly spin runner:  
`cd spin-runner`  
`source venv/bin/activate`  
`spin build --up --listen 127.0.01:3001`

Start up the backend server:    
`cd backend`    
`npm install`   
`npm run dev`   

Start up the frontend client:   
`cd frontend`   
`npm install`   
`npm run dev`   