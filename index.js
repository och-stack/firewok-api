const express = require("express");
const { Pool } = require("pg");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
pool.query("SELECT NOW()", (error, result) => {
  if (error) {
    console.log("Database connection failed");
  } else {
    console.log("Database connected");
  }
});

// API documentation
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// GET all recipes
app.get("/recipes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        recipes.id,
        recipes.name,
        recipes.ingredients,
        recipes.instructions,
        users.name AS author,
        categories.name AS category
      FROM recipes
      JOIN users
        ON recipes.author_id = users.id
      JOIN categories
        ON recipes.category_id = categories.id
      ORDER BY recipes.id;
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get recipes",
    });
  }
});

// GET one recipe
app.get("/recipes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "Recipe ID must be a number",
      });
    }

    const result = await pool.query(
      `
      SELECT
        recipes.id,
        recipes.name,
        recipes.ingredients,
        recipes.instructions,
        users.name AS author,
        categories.name AS category
      FROM recipes
      JOIN users
        ON recipes.author_id = users.id
      JOIN categories
        ON recipes.category_id = categories.id
      WHERE recipes.id = $1;
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Recipe not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get recipe",
    });
  }
});

// POST new recipe
app.post("/recipes", async (req, res) => {
  try {
    const {
      name,
      ingredients,
      author_id,
      category_id,
      instructions,
    } = req.body;

    if (
      !name ||
      !ingredients ||
      !author_id ||
      !category_id ||
      !instructions
    ) {
      return res.status(400).json({
        error: "All recipe fields are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO recipes
      (name, ingredients, author_id, category_id, instructions)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
      `,
      [
        name,
        ingredients,
        author_id,
        category_id,
        instructions,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Foreign key error
    if (error.code === "23503") {
      return res.status(400).json({
        error: "Author or category does not exist",
      });
    }

    res.status(500).json({
      error: "Failed to create recipe",
    });
  }
});

// GET all users
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM users
      ORDER BY id;
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get users",
    });
  }
});

// POST new user
app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: "Name and email are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO users (name, email)
      VALUES ($1, $2)
      RETURNING *;
      `,
      [name, email]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Duplicate email error
    if (error.code === "23505") {
      return res.status(400).json({
        error: "Email already exists",
      });
    }

    res.status(500).json({
      error: "Failed to create user",
    });
  }
});

// GET all categories
app.get("/categories", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM categories
      ORDER BY id;
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get categories",
    });
  }
});

// Start server
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`FireWok API running on port ${PORT}`);
});