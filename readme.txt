================================================================
 ONLINE FOOD DELIVERY WEBSITE
 FREE RESOURCES & TECHNOLOGIES - DETAILED README
================================================================

OVERVIEW
--------
This document lists the free and open-source resources/technologies
commonly used to build an online food delivery website (similar to
Swiggy/Zomato), covering frontend, backend, database, payments,
maps, notifications, and hosting.


1. FRONTEND (Customer, Restaurant, Delivery Partner Interfaces)
-----------------------------------------------------------------
- HTML5, CSS3, JavaScript        : Base building blocks, completely free
- React.js / Vue.js / Angular    : Free, open-source JS frameworks for
                                    building interactive UIs
- Bootstrap / Tailwind CSS       : Free CSS frameworks for fast,
                                    responsive styling
- Flutter / React Native         : Free cross-platform frameworks for
                                    building mobile apps from one codebase


2. BACKEND / SERVER
-----------------------------------------------------------------
- Node.js (Express.js)  : Free JS runtime; popular for real-time
                           order handling
- Django / Flask (Python): Free Python frameworks; good for rapid
                           development
- Laravel (PHP)          : Free; widely used for e-commerce-style sites
- Spring Boot (Java)     : Free; used for larger scale systems


3. DATABASE
-----------------------------------------------------------------
- MySQL / PostgreSQL : Free relational databases for orders, users,
                        menus, restaurants
- MongoDB             : Free NoSQL database; flexible for menus/cart data
- Redis                : Free in-memory store; used for caching, sessions,
                        and live order status


4. REAL-TIME ORDER TRACKING & NOTIFICATIONS
-----------------------------------------------------------------
- Socket.io                      : Free library for real-time
                                    communication (live order status,
                                    delivery tracking)
- Firebase Cloud Messaging (FCM) : Free push notifications for order
                                    updates
- Firebase Realtime DB / Firestore: Free tier available; useful for
                                    live tracking data


5. MAPS & LOCATION
-----------------------------------------------------------------
- OpenStreetMap (OSM)   : Completely free, open-source map data
                           (alternative to Google Maps)
- Leaflet.js             : Free JS library to display OSM maps and
                           plot delivery routes
- Google Maps API        : Free usage tier (geocoding, distance
                           calculation, live tracking); becomes paid
                           beyond quota


6. AUTHENTICATION
-----------------------------------------------------------------
- Firebase Authentication : Free tier for email/phone/social login
- JWT (JSON Web Token)    : Free, open standard for secure session/
                             auth handling
- OAuth (Google/Facebook) : Free to implement


7. PAYMENT GATEWAY
-----------------------------------------------------------------
- Razorpay, Stripe, PayPal, Paytm
  Integration/SDK is free to use; they charge a small transaction
  fee only on real payments. Sandbox/test mode is free for development
  and testing.


8. IMAGE & FILE STORAGE
-----------------------------------------------------------------
- Cloudinary       : Free tier for image hosting/optimization
                      (restaurant/menu photos)
- Firebase Storage  : Free tier for file storage
- Amazon S3         : Limited free tier for storing images


9. HOSTING & DEPLOYMENT (FREE TIERS)
-----------------------------------------------------------------
- Vercel / Netlify     : Free hosting for frontend (React/Vue/Next.js)
- Render / Railway      : Free tiers for backend hosting
- Heroku                : Limited free options, mostly paid now
- GitHub Pages          : Free static hosting (simple frontend demos)
- MongoDB Atlas         : Free tier (512MB) cloud database hosting


10. VERSION CONTROL & COLLABORATION
-----------------------------------------------------------------
- Git & GitHub / GitLab : Completely free for code versioning and
                           team collaboration


11. ADMIN PANEL / CMS (Optional)
-----------------------------------------------------------------
- React Admin or custom dashboards : Free, open-source admin panel
                                      libraries


================================================================
 SAMPLE FREE TECH STACK (MERN-BASED)
================================================================
Frontend      : React.js + Tailwind CSS
Backend       : Node.js + Express.js
Database      : MongoDB Atlas (free tier)
Real-time     : Socket.io
Maps          : Leaflet.js + OpenStreetMap
Auth          : Firebase Authentication
Notifications : Firebase Cloud Messaging
Hosting       : Vercel (frontend) + Render (backend)

This combination can run a fully functional food delivery website
at zero or near-zero cost, until scaling requires moving to paid
tiers (e.g., higher Google Maps usage, payment gateway fees, or
increased hosting bandwidth).

================================================================
 END OF README
================================================================