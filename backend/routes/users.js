import express from "express";
import db from "../db/config.js";

const router = express.Router();

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of records per page
 *     tags:
 *       - Users
 *     responses:
 *       '200':
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 */

router.get("/", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  try {
    const results = await db
      .collection("users")
      .find({})
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ id: 1 })
      .toArray();
    res.status(200).send(results);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});
/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID and include their top 3 rated animes
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to retrieve
 *     responses:
 *       '200':
 *         description: User found with their top 3 rated animes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 avaliacoes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       animeId:
 *                         type: integer
 *                       nota:
 *                         type: integer
 *                       comentario:
 *                         type: string
 *                       data:
 *                         type: string
 *                 topRatedAnimes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       animeId:
 *                         type: integer
 *                       nota:
 *                         type: integer
 *                       comentario:
 *                         type: string
 *                       data:
 *                         type: string
 *       '400':
 *         description: Invalid user ID parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get("/:id", async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).send({ error: "Invalid user ID" });
  }

  try {
    const collection = db.collection("users");
    const user = await collection.findOne({ id: userId });

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // Sort the user's ratings by nota in descending order and take the top 3
    const topRatedAnimes = (user.avaliacoes || [])
      .sort((a, b) => b.nota - a.nota)
      .slice(0, 3);

    res.status(200).send({ ...user, topRatedAnimes });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Add one or more users
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *     responses:
 *       '201':
 *         description: User(s) added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 insertedCount:
 *                   type: integer
 *                 insertedIds:
 *                   type: object
 *       '400':
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '409':
 *         description: Duplicate user record exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post("/", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Request body is required" });
  }

  const rawUsers = Array.isArray(req.body) ? req.body : [req.body];

  if (rawUsers.length === 0) {
    return res.status(400).json({ error: "At least one user is required" });
  }

  // 1. Validate all users first before hitting the database
  for (const user of rawUsers) {
    if (!user || typeof user !== "object" || !user.name || !user.email) {
      return res.status(400).json({
        error: "Each user must be an object with 'name' and 'email'",
      });
    }
  }

  try {
    const collection = db.collection("users");

    // 2. Fetch the highest numeric id ONCE
    const lastUser = await collection
      .find({ id: { $type: "number" } })
      .sort({ id: -1 })
      .limit(1)
      .toArray();

    let nextId = lastUser.length > 0 ? lastUser[0].id + 1 : 1;

    // 3. Assign and increment nextId for each user in the batch
    const usersToInsert = rawUsers.map((user) => ({
      id: nextId++,
      name: String(user.name).trim(),
      email: String(user.email).trim().toLowerCase(),
    }));

    const result = await collection.insertMany(usersToInsert);

    return res.status(201).json({
      message: "User(s) added successfully",
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Duplicate user record exists" });
    }
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update a user by ID
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               idade:
 *                 type: integer
 *               cidade:
 *                 type: string
 *               distrito:
 *                 type: string
 *               pais:
 *                 type: string
 *               data_registo:
 *                 type: string
 *                 format: date
 *               activo:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '400':
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '404':
 *         description: User or anime not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.put("/:id", async (req, res) => {
  const userId = Number(req.params.id);
  const { name, email, idade, cidade, distrito, pais, data_registo, activo } =
    req.body ?? {};

  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).send({ error: "Invalid user ID" });
  }

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return res.status(400).send({ error: "Invalid name" });
  }

  if (email !== undefined && (typeof email !== "string" || !email.trim())) {
    return res.status(400).send({ error: "Invalid email" });
  }

  if (idade !== undefined && (!Number.isInteger(idade) || idade < 0)) {
    return res.status(400).send({ error: "Invalid idade" });
  }

  if (cidade !== undefined && (typeof cidade !== "string" || !cidade.trim())) {
    return res.status(400).send({ error: "Invalid cidade" });
  }

  if (
    distrito !== undefined &&
    (typeof distrito !== "string" || !distrito.trim())
  ) {
    return res.status(400).send({ error: "Invalid distrito" });
  }

  if (pais !== undefined && (typeof pais !== "string" || !pais.trim())) {
    return res.status(400).send({ error: "Invalid pais" });
  }

  if (
    data_registo !== undefined &&
    (typeof data_registo !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data_registo))
  ) {
    return res
      .status(400)
      .send({ error: "data_registo must use YYYY-MM-DD format" });
  }

  if (activo !== undefined && typeof activo !== "boolean") {
    return res.status(400).send({ error: "Invalid activo" });
  }

  try {
    const collection = db.collection("users");
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (idade !== undefined) updates.idade = idade;
    if (cidade !== undefined) updates.cidade = cidade.trim();
    if (distrito !== undefined) updates.distrito = distrito.trim();
    if (pais !== undefined) updates.pais = pais.trim();
    if (data_registo !== undefined) updates.data_registo = data_registo;
    if (activo !== undefined) updates.activo = activo;
    if (Object.keys(updates).length === 0) {
      return res.status(400).send({ error: "No valid fields to update" });
    }

    const result = await collection.updateOne(
      { id: userId },
      { $set: updates },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "User not found" });
    }

    res.status(200).send({ message: "User updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /users/ratings/{order}:
 *   get:
 *     summary: Get users sorted by the number of ratings
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: order
 *         required: true
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: The sorting order (asc for ascending, desc for descending)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       '200':
 *         description: A list of users sorted by the number of ratings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 */
router.get("/ratings/:order", async (req, res) => {
  const order = req.params.order.toString();
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  const isValidOrder = order === "asc" || order === "desc";

  if (!isValidOrder) {
    return res
      .status(400)
      .send({ error: "Invalid sorting order. Use asc or desc" });
  }
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  const sortDirection = order === "asc" ? 1 : -1;

  try {
    const collection = db.collection("users");
    const result = await collection
      .aggregate([
        {
          $addFields: {
            total_avaliacoes: {
              $size: { $ifNull: ["$avaliacoes", []] },
            },
          },
        },
        {
          $sort: { total_avaliacoes: sortDirection, id: 1 },
        },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $unset: "total_avaliacoes",
        },
      ])
      .toArray();

    res.status(200).send(result);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ "error: ": "Internal server error" });
  }
});

/**
 * @openapi
 * /users/star:
 *   get:
 *     summary: Get users sorted by the number of 5-star ratings
 *     tags:
 *       - Users
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       '200':
 *         description: A list of users sorted by the number of 5-star ratings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 */
router.get("/star", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  try {
    const collection = db.collection("users");
    const result = await collection
      .aggregate([
        {
          $addFields: {
            stars: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$avaliacoes", []] },
                  as: "item",
                  cond: { $eq: ["$$item.nota", 5] },
                },
              },
            },
          },
        },
        {
          $sort: { stars: -1, id: 1 },
        },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $unset: "stars",
        },
      ])
      .toArray();
    res.status(200).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

/**
 * @openapi
 * /users/year/{year}:
 *   get:
 *     summary: Get users who have ratings in a specific year
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: The year to filter ratings by
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       '200':
 *         description: A list of users with ratings in the specified year
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 */
router.get("/year/:year", async (req, res) => {
  const year = Number(req.params.year);

  if (!Number.isInteger(year) || year < 0) {
    return res.status(400).send({ error: "Invalid year parameter" });
  }

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  try {
    const collection = db.collection("users");
    const result = await collection
      .aggregate([
        {
          $addFields: {
            filteredRatings: {
              $filter: {
                input: { $ifNull: ["$avaliacoes", []] },
                as: "item",
                cond: {
                  $eq: [
                    {
                      $year: {
                        $convert: {
                          input: "$$item.data",
                          to: "date",
                          onError: null,
                          onNull: null,
                        },
                      },
                    },
                    year,
                  ],
                },
              },
            },
          },
        },
        {
          $match: {
            filteredRatings: { $ne: [] },
          },
        },
        { $sort: { id: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $set: { avaliacoes: "$filteredRatings" } },
        {
          $unset: "filteredRatings",
        },
      ])
      .toArray();
    res.status(200).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /users/{id}/review/{animeId}:
 *   post:
 *     summary: Add a review for a specific anime by a user
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user
 *       - in: path
 *         name: animeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the anime being reviewed
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nota:
 *                 type: integer
 *                 description: The rating (1 to 5)
 *               comentario:
 *                 type: string
 *                 description: The comment for the review
 *               data:
 *                 type: string
 *                 format: date
 *                 description: The date of the review in YYYY-MM-DD format
 *     responses:
 *       '200':
 *         description: Review added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '400':
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '404':
 *         description: User or anime not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post("/:id/review/:animeId", async (req, res) => {
  const userId = Number(req.params.id);
  const animeId = Number(req.params.animeId);
  const { nota, comentario } = req.body ?? {};
  const { data } = req.body ?? {};

  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).send({ error: "Invalid user ID" });
  }
  if (!Number.isInteger(animeId) || animeId < 1) {
    return res.status(400).send({ error: "Invalid anime ID" });
  }
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    return res
      .status(400)
      .send({ error: "Rating must be an integer from 1 to 5" });
  }
  if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return res
      .status(400)
      .send({ error: "Review date must use YYYY-MM-DD format" });
  }

  if (comentario && typeof comentario !== "string") {
    return res.status(400).send({ error: "Comment must be a string" });
  }

  try {
    const anime = await db.collection("anime").findOne({ id: animeId });
    if (!anime) {
      return res.status(404).send({ error: "Anime not found" });
    }

    const collection = db.collection("users");
    const result = await collection.updateOne(
      { id: userId },
      {
        $push: {
          avaliacoes: {
            item_id: animeId,
            nota,
            comentario,
            data,
          },
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "User not found" });
    }

    res.status(200).send({ message: "Review added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user by ID
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to delete
 *     responses:
 *       '200':
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '400':
 *         description: Invalid user ID parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.delete("/:id", async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).send({ error: "Invalid user ID" });
  }

  try {
    const collection = db.collection("users");
    const result = await collection.deleteOne({ id: userId });

    if (result.deletedCount === 0) {
      return res.status(404).send({ error: "User not found" });
    }

    res.status(200).send({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
