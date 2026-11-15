import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";
import swaggerJSDoc from "swagger-jsdoc";

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users
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
const router = express.Router();
// return first 50 documents from users collection
router.get("/", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);

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
export default router;
