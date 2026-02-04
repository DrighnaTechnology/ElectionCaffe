#!/bin/bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@electioncaffe.com","password":"admin123"}'
