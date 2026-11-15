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
  if (!Number.isInteger(limit) || limit < 1) {
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

  const isValidOrder = order === "asc" || order === "desc";

  if (!isValidOrder) {
    return res
      .status(400)
      .send({ error: "Invalid sorting order. Use asc or desc" });
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
          $sort: { total_avaliacoes: sortDirection },
        },

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
          $sort: { stars: -1 },
        },
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
 *         description: User not found
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
  const { nota, comentario, data } = req.body ?? {};

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
    const collection = db.collection("users");
    const result = await collection.updateOne(
      { id: userId },
      {
        $push: {
          avaliacoes: {
            animeId,
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
export default router;
