const DATABASE_NAME = process.env.MONGO_DB_NAME;
const MONGO_DB_USERNAME = process.env.MONGO_DB_USERNAME;
const MONGO_DB_PASSWORD = process.env.MONGO_DB_PASSWORD;

db.getSiblingDB(DATABASE_NAME).createUser({
  user: MONGO_DB_USERNAME,
  pwd: MONGO_DB_PASSWORD,
  roles: [
    {
      role: 'readWrite',
      db: DATABASE_NAME
    }
  ]
})