# Expense Tracker API

A full-scale Expense Tracker API built with Express.js, TypeScript, MongoDB, and Redis. This API provides comprehensive expense management functionality with user authentication, data caching, and robust validation.

## 🏗️ Architecture

The project follows a clean architecture pattern with the following layers:

```
src/
├── models/          → TypeScript interfaces & data models
├── repositories/    → Raw MongoDB queries & data access
├── services/        → Business logic & Redis caching
├── controllers/     → Express route handlers
├── routes/          → API route definitions
├── validators/      → Joi validation schemas
├── middlewares/     → Auth, validation, error handling
├── config/          → Database, Redis, JWT configuration
├── utils/           → Logger, helpers, utilities
└── server.ts        → Express app entry point
```

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (native driver)
- **Cache**: Redis
- **Validation**: Joi
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcrypt, helmet, rate limiting
- **Logging**: Winston
- **Environment**: dotenv

## ✨ Features

### 👤 User Management
- User registration with email uniqueness
- Secure password hashing with bcrypt
- JWT-based authentication with refresh tokens
- User profile management
- Password change functionality

### 💸 Expense Management
- Create, read, update, delete expenses
- Expense categorization (Groceries, Leisure, Electronics, etc.)
- Advanced filtering:
  - Date ranges (past week, month, 3 months, custom)
  - Category filtering
  - Pagination support
- Expense summaries with category breakdowns

### 🔒 Security & Performance
- JWT authentication with configurable expiration
- Password strength validation
- Rate limiting (100 requests per 15 minutes)
- Request validation with Joi schemas
- Redis caching for frequently accessed data
- Comprehensive error handling
- Request/response logging

### 📊 Database Optimization
- MongoDB indexes on frequently queried fields:
  - Users: `email` (unique), `createdAt`
  - Expenses: `userId`, `userId + createdAt`, `userId + category`
- Aggregation pipelines for expense summaries

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Redis (v6 or higher)
- npm or yarn

### Installation

1. **Clone and setup**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configurations:
   ```env
   # Server
   PORT=3000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/expense_tracker
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   # JWT (Change these in production!)
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-refresh-token-secret
   ```

3. **Start Dependencies**
   ```bash
   # Start MongoDB
   mongod
   
   # Start Redis
   redis-server
   ```

4. **Run the Application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## 📡 API Endpoints

### Authentication
```http
POST /api/auth/register    # User registration
POST /api/auth/login       # User login
POST /api/auth/refresh     # Refresh access token
GET  /api/auth/profile     # Get user profile
PUT  /api/auth/profile     # Update user profile
POST /api/auth/change-password  # Change password
```

### Expenses
```http
POST   /api/expenses           # Create expense
GET    /api/expenses           # List expenses (with filters)
GET    /api/expenses/:id       # Get expense by ID
PUT    /api/expenses/:id       # Update expense
DELETE /api/expenses/:id       # Delete expense
GET    /api/expenses/summary   # Get expense summary
```

### Expense Query Parameters
```http
GET /api/expenses?period=week&category=Groceries&page=1&limit=20
GET /api/expenses?period=custom&startDate=2023-01-01&endDate=2023-12-31
```

### Health Check
```http
GET /health    # Service health status
```

## 🗃️ Data Models

### User
```typescript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  firstName: string,
  lastName: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Expense
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,
  description?: string,
  amount: number,
  category: ExpenseCategory,
  createdAt: Date,
  updatedAt: Date
}
```

### Expense Categories
- Groceries
- Leisure  
- Electronics
- Utilities
- Clothing
- Health
- Others

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/expense_tracker |
| `REDIS_HOST` | Redis host | localhost |
| `JWT_SECRET` | JWT secret key | (required in production) |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit max requests | 100 |

### Database Indexes

The application automatically creates these indexes:

```javascript
// Users collection
{ email: 1 }           // Unique index
{ createdAt: -1 }      // Time-based queries

// Expenses collection  
{ userId: 1 }                    // User's expenses
{ userId: 1, createdAt: -1 }     // User's expenses by date
{ userId: 1, category: 1 }       // User's expenses by category
{ createdAt: -1 }                // Global time-based queries
```

## 📝 Request/Response Examples

### User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.doe@example.com",
  "password": "StrongPass123!"
}
```

### Create Expense
```http
POST /api/expenses
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Grocery Shopping",
  "description": "Weekly groceries", 
  "amount": 125.50,
  "category": "Groceries"
}
```

### Response Format
```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {
    "id": "64f8b...",
    "title": "Grocery Shopping",
    "amount": 125.50,
    "category": "Groceries",
    "createdAt": "2023-09-06T10:30:00.000Z"
  }
}
```

## 🔍 Logging

The application uses Winston for structured logging:

- **Console**: Development environment
- **Files**: `logs/app.log` and `logs/error.log`  
- **Levels**: error, warn, info, debug

Log entries include:
- Timestamp
- Request details (method, URL, IP)
- User context
- Error stack traces (development)

## 🛡️ Security Features

- **Password Security**: bcrypt with configurable rounds
- **JWT Tokens**: Access + refresh token pattern
- **Rate Limiting**: Configurable request limits
- **Input Validation**: Joi schemas for all inputs
- **CORS**: Configurable cross-origin policies
- **Helmet**: Security headers
- **Error Sanitization**: No sensitive data in responses

## 🚀 Production Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   JWT_SECRET=<strong-secret-key>
   JWT_REFRESH_SECRET=<strong-refresh-secret>
   ```

2. **Build Application**
   ```bash
   npm run build
   ```

3. **Process Management**
   ```bash
   # Using PM2
   pm2 start dist/server.js --name expense-tracker-api
   
   # Using Docker
   docker build -t expense-tracker-api .
   docker run -p 3000:3000 expense-tracker-api
   ```

## 📊 Monitoring

The `/health` endpoint provides comprehensive health checks:
- Database connectivity
- Redis connectivity  
- Memory usage
- Uptime statistics

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ using TypeScript, Express.js, MongoDB, and Redis.