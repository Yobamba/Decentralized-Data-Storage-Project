import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";
import swaggerJSDoc from "swagger-jsdoc";

/**
 * @openapi
 * /anime:
 *   get:
 *     summary: Get all anime
 *     tags:
 *       - Anime
 *     responses:
 *       '200':
 *         description: A list of anime
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

// #1 return first 50 documents from anime collection
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
      .collection("anime")
      .find({})
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ id: -1 }) // Sort by id in ascending order
      .toArray();

    res.status(200).send(results);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /anime:
 *   post:
 *     summary: Add one or multiple anime records
 *     tags:
 *       - Anime
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *               - type: array
 *                 items:
 *                   type: object
 *     responses:
 *       '201':
 *         description: Record(s) created successfully
 *       '400':
 *         description: Invalid request payload
 *       '500':
 *         description: Internal server error
 */

// #3 Add one or multiple anime records
router.post("/", async (req, res) => {
  if (!req.body) {
    return res.status(400).send({ error: "Request body is missing" });
  }

  const items = Array.isArray(req.body) ? req.body : [req.body];
  const highestId = await db
    .collection("anime")
    .find()
    .sort({ id: -1 })
    .limit(1)
    .toArray();

  let newId = highestId.length > 0 ? highestId[0].id + 1 : 1;

  try {
    const collection = db.collection("anime");

    const documentsToInsert = items.map((item) => {
      newId += 1;
      return {
        id: newId + 1,
        titulo: item.titulo,
        genero: item.genero,
        ano_lancamento: item.ano_lancamento,
        estudio: item.estudio,
        episodios: item.episodios,
        classificacao_imdb: item.classificacao_imdb,
        idioma_original: item.idioma_original,
        popularidade: item.popularidade,
      };
    });

    const result = await collection.insertMany(documentsToInsert);

    res
      .status(201)
      .send({ message: "Anime added successfully", id: result.insertedId });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/** * @openapi
 * /anime/{id}:
 *   get:
 *     summary: Get anime by ID
 *     tags:
 *       - Anime
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the anime to retrieve
 *     responses:
 *       '200':
 *         description: Anime found and returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *       '400':
 *         description: Invalid anime ID provided
 *       '404':
 *         description: Anime not found with the given ID
 */
router.get("/:id", async (req, res) => {
  try {
    const animeId = parseInt(req.params.id);
    if (isNaN(animeId)) {
      return res.status(400).send({ error: "Invalid anime ID" });
    }

    const collection = db.collection("anime");
    const anime = await collection.findOne({ id: animeId });

    if (!anime) {
      return res.status(404).send({ error: "Anime not found" });
    }

    res.status(200).send(anime);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});
export default router;
