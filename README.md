# Online Examination & Remote Proctoring System

A web-based online exam platform with real-time AI face monitoring and proctoring.

## Features
- Admin panel to create exams, manage questions, and evaluate results.
- Candidate exam workspace with interactive palette navigation.
- MediaPipe Face Mesh AI for real-time webcam proctoring (Multiple faces / No face detection).
- Fullscreen enforcement and focus-loss violation counter.
- Automatic scoring with support for negative marking.

## Setup Instructions
1. Run `database.sql` in Supabase SQL Editor.
2. Update Supabase URL & Anon Key in `config.js`.
3. Deploy to Cloudflare Pages via GitHub.
