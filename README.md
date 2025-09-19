# Rougee Play API v1

A secure, production-ready API built with Fastify, TypeScript, and modern security practices.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with bcrypt password hashing
- **Rate Limiting**: Prevents abuse with configurable limits
- **Security Headers**: Helmet.js for security headers
- **CORS Protection**: Configurable cross-origin resource sharing
- **Input Validation**: Zod schemas for request validation
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Environment Configuration**: Secure environment variable management
- **TypeScript**: Full type safety and modern JavaScript features

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn

## 🛠️ Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/rougecoin-project/rougee_play_v1.git
   cd rougee_play_v1
   ```

2. **Install dependencies**
   ```bash
   cd api
   npm install
   ```

3. **Environment Configuration**
   
   Copy the example environment file:
   ```bash
   cp env.example .env
   ```
   
   **⚠️ IMPORTANT**: Update the `.env` file with your own values:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # Security - CHANGE THESE IN PRODUCTION!
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
   BCRYPT_ROUNDS=12
   
   # Rate Limiting
   RATE_LIMIT_MAX=100
   RATE_LIMIT_TIME_WINDOW=60000
   
   # CORS
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔐 Security Features

### Authentication
- JWT tokens with 7-day expiration
- bcrypt password hashing (12 rounds)
- Protected routes with middleware

### Rate Limiting
- 100 requests per minute by default
- Configurable via environment variables

### Security Headers
- Helmet.js for security headers
- CORS protection
- Input validation with Zod

### Environment Security
- All sensitive data in environment variables
- Example file provided (never commit `.env`)

## 📚 API Endpoints

### Public Endpoints
- `GET /` - API information
- `GET /health` - Health check
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Protected Endpoints (require Bearer token)
- `GET /auth/me` - Get current user info
- `GET /users` - List all users (public info only)

## 🔧 Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🚀 Production Deployment

1. **Set production environment variables**
2. **Use a proper database** (replace in-memory storage)
3. **Enable HTTPS**
4. **Set up monitoring and logging**
5. **Configure reverse proxy** (nginx, etc.)

## 📝 Example Usage

### Register a new user
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Access protected route
```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## ⚠️ Security Notes

- **Never commit `.env` files**
- **Change JWT_SECRET in production**
- **Use HTTPS in production**
- **Implement proper database in production**
- **Add monitoring and logging**
- **Regular security updates**

## 📄 License

ISC
