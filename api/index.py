"""
Tiffify OTP API — Vercel Python Serverless Function
Routes all /api/* requests to this Flask app.
Static files are served by Vercel from the public/ directory.
"""

import os
import sys

# Add the tiffify-otp-api directory to path so we can import the Flask app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tiffify-otp-api'))

from app import app
