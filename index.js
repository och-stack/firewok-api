const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.query("SELECT NOW()", (error, result) => {
  if (error) {
    console.log("Database connection failed");
  } else {
    console.log("Database connected");
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`FireWok API running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.json({
    name: "FireWok",
    slogan: "From Fire to Wok",
    endpoints: {
      recipes: {
        getAll: "GET /recipes",
        getOne: "GET /recipes/:id",
        create: "POST /recipes",
      },
      users: {
        getAll: "GET /users",
        create: "POST /users",
      },
      categories: {
        getAll: "GET /categories",
      },
    },
  });
});

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

app.get("/recipes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "Recipe ID must be a number",
      });
    }

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
      WHERE recipes.id = $1;
    `, [id]);

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

    const result = await pool.query(`
      INSERT INTO recipes
      (name, ingredients, author_id, category_id, instructions)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `, [
      name,
      ingredients,
      author_id,
      category_id,
      instructions,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to create recipe",
    });
  }
});


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

app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: "Name and email are required",
      });
    }

    const result = await pool.query(`
      INSERT INTO users (name, email)
      VALUES ($1, $2)
      RETURNING *;
    `, [name, email]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to create user",
    });
  }
});

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