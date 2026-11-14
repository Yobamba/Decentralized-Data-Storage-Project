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

/** * @openapi
 * /anime/{id}:
 *   delete:
 *     summary: Delete anime by ID
 *     tags:
 *       - Anime
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the anime to delete
 *     responses:
 *       '200':
 *         description: Anime deleted successfully
 *       '400':
 *         description: Invalid anime ID provided
 *       '404':
 *         description: Anime not found with the given ID
 */

router.delete("/:id", async (req, res) => {
  try {
    const animeId = parseInt(req.params.id);
    if (isNaN(animeId)) {
      return res.status(400).send({ error: "Invalid anime ID" });
    }

    const collection = db.collection("anime");
    const result = await collection.deleteOne({ id: animeId });

    if (result.deletedCount === 0) {
      return res.status(404).send({ error: "Anime not found" });
    }

    res.status(200).send({ message: "Anime deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  const animeId = Number(req.params.id);

  if (!Number.isInteger(animeId)) {
    return res.status(400).send({ error: "Invalid: id must be an integer" });
  }

  const {
    titulo,
    genero,
    ano_lancamento,
    estudio,
    episodios,
    classificacao_imdb,
    idioma_original,
    popularidade,
  } = req.body ?? {};

  const updates = {};

  if (titulo !== undefined) {
    if (typeof titulo !== "string" || !titulo.trim()) {
      return res.status(400).send({ error: "Invalid titulo" });
    }
    updates.titulo = titulo.trim();
  }

  if (genero !== undefined) {
    if (typeof genero !== "string" || !genero.trim()) {
      return res.status(400).send({ error: "Invalid genero" });
    }
    updates.genero = genero.trim();
  }

  if (ano_lancamento !== undefined) {
    if (!Number.isInteger(ano_lancamento) || ano_lancamento < 0) {
      return res.status(400).send({ error: "Invalid ano_lancamento" });
    }
    updates.ano_lancamento = ano_lancamento;
  }

  if (estudio !== undefined) {
    if (typeof estudio !== "string" || !estudio.trim()) {
      return res.status(400).send({ error: "Invalid estudio" });
    }
    updates.estudio = estudio.trim();
  }

  if (episodios !== undefined) {
    if (!Number.isInteger(episodios) || episodios < 0) {
      return res.status(400).send({ error: "Invalid number of episodios" });
    }
    updates.episodios = episodios;
  }

  if (classificacao_imdb !== undefined) {
    if (
      typeof classificacao_imdb !== "number" ||
      Number.isNaN(classificacao_imdb) ||
      classificacao_imdb < 0 ||
      classificacao_imdb > 10
    ) {
      return res.status(400).send({ error: "Invalid classificacao_imdb" });
    }
    updates.classificacao_imdb = classificacao_imdb;
  }

  if (idioma_original !== undefined) {
    if (typeof idioma_original !== "string" || !idioma_original.trim()) {
      return res.status(400).send({ error: "Invalid idioma_original" });
    }
    updates.idioma_original = idioma_original.trim();
  }

  if (popularidade !== undefined) {
    if (typeof popularidade !== "number" || Number.isNaN(popularidade)) {
      return res.status(400).send({ error: "Invalid popularidade" });
    }
    updates.popularidade = popularidade;
  }

  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .send({ error: "No valid fields provided to update" });
  }

  try {
    const collection = db.collection("anime");
    const result = await collection.updateOne(
      { id: animeId },
      { $set: updates },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Not found" });
    }

    res.status(200).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
});
export default router;
