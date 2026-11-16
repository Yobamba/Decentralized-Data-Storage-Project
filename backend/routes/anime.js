import express from "express";
import db from "../db/config.js";

const router = express.Router();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @openapi
 * /anime:
 *   get:
 *     summary: Get all anime
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
// Return a page of anime documents.
router.get("/", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  const skip = (page - 1) * limit;

  try {
    const results = await db
      .collection("anime")
      .find({})
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
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
 *                 required:
 *                   - titulo
 *                 properties:
 *                   titulo:
 *                     type: string
 *                   genero:
 *                     type: string
 *                   ano_lancamento:
 *                     type: integer
 *                   estudio:
 *                     type: string
 *                   episodios:
 *                     type: integer
 *                   classificacao_imdb:
 *                     type: number
 *                   idioma_original:
 *                     type: string
 *                   popularidade:
 *                     type: string
 *               - type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - titulo
 *                   properties:
 *                     titulo:
 *                       type: string
 *                     genero:
 *                       type: string
 *                     ano_lancamento:
 *                       type: integer
 *                     estudio:
 *                       type: string
 *                     episodios:
 *                       type: integer
 *                     classificacao_imdb:
 *                       type: number
 *                     idioma_original:
 *                       type: string
 *                     popularidade:
 *                       type: string
 *           examples:
 *             singleAnime:
 *               summary: Single anime
 *               value:
 *                 titulo: "Frieren: Beyond Journey's End"
 *                 genero: "Fantasia"
 *                 ano_lancamento: 2023
 *                 estudio: "Madhouse"
 *                 episodios: 28
 *                 classificacao_imdb: 8.9
 *                 idioma_original: "Japonês"
 *                 popularidade: "Alta"
 *             multipleAnime:
 *               summary: Multiple anime (array)
 *               value:
 *                 - titulo: "Chainsaw Man"
 *                   genero: "Ação"
 *                   ano_lancamento: 2022
 *                   estudio: "MAPPA"
 *                   episodios: 12
 *                   classificacao_imdb: 8.4
 *                   idioma_original: "Japonês"
 *                   popularidade: "Alta"
 *                 - titulo: "Dandadan"
 *                   genero: "Ação"
 *                   ano_lancamento: 2024
 *                   estudio: "Science SARU"
 *                   episodios: 12
 *                   classificacao_imdb: 8.5
 *                   idioma_original: "Japonês"
 *                   popularidade: "Alta"
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
  try {
    const collection = db.collection("anime");
    const highestId = await collection
      .find({ id: { $type: "number" } })
      .sort({ id: -1 })
      .limit(1)
      .toArray();

    let nextId = highestId.length > 0 ? highestId[0].id + 1 : 1;

    const documentsToInsert = items.map((item) => ({
      id: nextId++,
      titulo: item.titulo,
      genero: item.genero,
      ano_lancamento: item.ano_lancamento,
      estudio: item.estudio,
      episodios: item.episodios,
      classificacao_imdb: item.classificacao_imdb,
      idioma_original: item.idioma_original,
      popularidade: item.popularidade,
    }));

    const result = await collection.insertMany(documentsToInsert);

    res.status(201).send({
      message: "Anime added successfully",
      insertedCount: result.insertedCount,
      ids: documentsToInsert.map((document) => document.id),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /anime/genre/{genre}:
 *   get:
 *     summary: Find anime by genre
 *     tags:
 *       - Anime
 *     parameters:
 *       - in: path
 *         name: genre
 *         required: true
 *         schema:
 *           type: string
 *         description: Genre to match (URL-encode spaces)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       '200':
 *         description: Matching anime ordered by popularity
 *       '400':
 *         description: Invalid pagination parameters
 *       '500':
 *         description: Internal server error
 */
router.get("/genre/:genre", async (req, res) => {
  const genre = req.params.genre.trim();
  if (!genre || genre.length > 100) {
    return res.status(400).send({ error: "Invalid genre" });
  }

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  const genrePattern = `(^|,\\s*)${escapeRegex(genre)}(\\s*,|$)`;
  try {
    const results = await db
      .collection("anime")
      .find({ genero: { $regex: genrePattern, $options: "i" } })
      .sort({ popularidade: -1, id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return res.status(200).send(results);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /anime/year/{year}:
 *   get:
 *     summary: Find anime reviewed during a year
 *     tags:
 *       - Anime
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Year the review was submitted
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       '200':
 *         description: Anime with reviews submitted during the specified year
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   titulo:
 *                     type: string
 *                   ano_lancamento:
 *                     type: integer
 *                   userRatings:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: integer
 *                         nome:
 *                           type: string
 *                         nota:
 *                           type: number
 *                         comentario:
 *                           type: string
 *                         data:
 *                           type: string
 *                           format: date
 *       '400':
 *         description: Invalid year or pagination parameters
 *       '500':
 *         description: Internal server error
 */
router.get("/year/:year", async (req, res) => {
  const year = Number(req.params.year);
  if (!Number.isInteger(year) || year < 0) {
    return res.status(400).send({ error: "Invalid review year" });
  }

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  try {
    const yearStart = `${year}-01-01`;
    const nextYearStart = `${year + 1}-01-01`;
    const results = await db
      .collection("anime")
      .aggregate([
        {
          $lookup: {
            from: "users",
            let: { animeId: "$id" },
            pipeline: [
              { $unwind: "$avaliacoes" },
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$avaliacoes.item_id", "$$animeId"] },
                      { $gte: ["$avaliacoes.data", yearStart] },
                      { $lt: ["$avaliacoes.data", nextYearStart] },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  userId: "$id",
                  nome: 1,
                  nota: "$avaliacoes.nota",
                  comentario: "$avaliacoes.comentario",
                  data: "$avaliacoes.data",
                },
              },
            ],
            as: "userRatings",
          },
        },
        { $match: { "userRatings.0": { $exists: true } } },
        { $sort: { classificacao_imdb: -1, id: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ])
      .toArray();

    return res.status(200).send(results);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /anime/studio/{studio}:
 *   get:
 *     summary: Find anime by studio
 *     tags:
 *       - Anime
 *     parameters:
 *       - in: path
 *         name: studio
 *         required: true
 *         schema:
 *           type: string
 *         description: Studio name to match (URL-encode spaces)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       '200':
 *         description: Matching anime ordered by popularity
 *       '400':
 *         description: Invalid studio or pagination parameters
 *       '500':
 *         description: Internal server error
 */
router.get("/studio/:studio", async (req, res) => {
  const studio = req.params.studio.trim();
  if (!studio || studio.length > 100) {
    return res.status(400).send({ error: "Invalid studio" });
  }

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  try {
    const results = await db
      .collection("anime")
      .find({
        estudio: { $regex: `^${escapeRegex(studio)}$`, $options: "i" },
      })
      .sort({ popularidade: -1, id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return res.status(200).send(results);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/** * @openapi
 * /anime/star:
 *   get:
 *     summary: Get anime with 5-star ratings from users
 *     tags:
 *       - Anime
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
 *     responses:
 *       '200':
 *         description: A list of anime with 5-star ratings from users
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
// endpoint to show the animes with 5 stars in the users collection
router.get("/star", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  const skip = (page - 1) * limit;

  try {
    const results = await db
      .collection("anime")
      .aggregate([
        {
          $lookup: {
            from: "users",
            let: { animeId: "$id" },
            pipeline: [
              { $unwind: "$avaliacoes" },
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$avaliacoes.item_id", "$$animeId"] },
                      { $eq: ["$avaliacoes.nota", 5] },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  userId: "$id",
                  nome: 1,
                  nota: "$avaliacoes.nota",
                  comentario: "$avaliacoes.comentario",
                  data: "$avaliacoes.data",
                },
              },
            ],
            as: "fiveStarRatings",
          },
        },
        {
          $match: { fiveStarRatings: { $ne: [] } },
        },
        {
          $addFields: {
            fiveStarCount: { $size: "$fiveStarRatings" },
          },
        },
        {
          $sort: { fiveStarCount: -1, id: 1 },
        },
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray();

    return res.status(200).send(results);
  } catch (error) {
    console.error("error: ", error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /anime/language/{language}:
 *   get:
 *     summary: Find anime by original language
 *     tags:
 *       - Anime
 *     parameters:
 *       - in: path
 *         name: language
 *         required: true
 *         schema:
 *           type: string
 *         description: Original language to match (URL-encode spaces)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       '200':
 *         description: Matching anime ordered by popularity
 *       '400':
 *         description: Invalid language or pagination parameters
 *       '500':
 *         description: Internal server error
 */
router.get("/language/:language", async (req, res) => {
  const language = req.params.language.trim();
  if (!language || language.length > 100) {
    return res.status(400).send({ error: "Invalid language" });
  }

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  try {
    const results = await db
      .collection("anime")
      .find({
        idioma_original: {
          $regex: `^${escapeRegex(language)}$`,
          $options: "i",
        },
      })
      .sort({ popularidade: -1, id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return res.status(200).send(results);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /anime/popularity/{popularity}:
 *   get:
 *     summary: Find anime by popularity category
 *     tags:
 *       - Anime
 *     parameters:
 *       - in: path
 *         name: popularity
 *         required: true
 *         schema:
 *           type: string
 *         description: Popularity category to match
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       '200':
 *         description: Matching anime ordered by IMDb rating
 *       '400':
 *         description: Invalid popularity category or pagination parameters
 *       '500':
 *         description: Internal server error
 */
router.get("/popularity/:popularity", async (req, res) => {
  const popularity = req.params.popularity.trim();
  if (!popularity || popularity.length > 100) {
    return res.status(400).send({ error: "Invalid popularity category" });
  }

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  try {
    const results = await db
      .collection("anime")
      .find({
        popularidade: { $regex: `^${escapeRegex(popularity)}$`, $options: "i" },
      })
      .sort({ classificacao_imdb: -1, id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return res.status(200).send(results);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/** * @openapi
 * /anime/{id}:
 *   get:
 *     summary: Get anime by ID with average score
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
 *         description: Anime details with average score
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 genero:
 *                   type: string
 *                 ano_lancamento:
 *                   type: integer
 *                 estudio:
 *                   type: string
 *                 episodios:
 *                   type: integer
 *                 classificacao_imdb:
 *                   type: number
 *                 idioma_original:
 *                   type: string
 *                 popularidade:
 *                   type: string
 *                 averageScore:
 *                   type: number
 *       '400':
 *         description: Invalid anime ID provided
 *       '404':
 *         description: Anime not found with the given ID
 *       '500':
 *         description: Internal server error
 */

// return the anime by the id with all the info about it plus the average score
router.get("/:id", async (req, res) => {
  const animeId = Number(req.params.id);

  if (!Number.isInteger(animeId)) {
    return res.status(400).send({ error: "Invalid: id must be an integer" });
  }

  try {
    const collection = db.collection("anime");
    const anime = await collection.findOne({ id: animeId });

    if (!anime) {
      return res.status(404).send({ error: "Anime not found" });
    }

    // Calculate the average score from the users collection
    const userRatings = await db
      .collection("users")
      .aggregate([
        { $unwind: "$avaliacoes" },
        { $match: { "avaliacoes.item_id": animeId } },
        {
          $group: {
            _id: null,
            averageScore: { $avg: "$avaliacoes.nota" },
          },
        },
      ])
      .toArray();

    const averageScore =
      userRatings.length > 0 ? userRatings[0].averageScore : null;

    res.status(200).send({ ...anime, averageScore });
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

/** * @openapi
 * /anime/{id}:
 *   put:
 *     summary: Update anime by ID
 *     tags:
 *       - Anime
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the anime to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               genero:
 *                 type: string
 *               ano_lancamento:
 *                 type: integer
 *               estudio:
 *                 type: string
 *               episodios:
 *                 type: integer
 *               classificacao_imdb:
 *                 type: number
 *               idioma_original:
 *                 type: string
 *               popularidade:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Anime updated successfully
 *       '400':
 *         description: Invalid request payload or anime ID
 *       '404':
 *         description: Anime not found with the given ID
 *       '500':
 *         description: Internal server error
 */
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
    if (typeof popularidade !== "string" || !popularidade.trim()) {
      return res.status(400).send({ error: "Invalid popularidade" });
    }
    updates.popularidade = popularidade.trim();
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

/** * @openapi
 * /anime/top/{limit}:
 *   get:
 *     summary: Get a page of top anime by average score
 *     tags:
 *       - Anime
 *     parameters:
 *       - in: path
 *         name: limit
 *         required: true
 *         schema:
 *           type: integer
 *           maximum: 100
 *         description: Number of top anime per page (maximum 100)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       '200':
 *         description: A list of top anime by average score
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
 *                   genero:
 *                     type: string
 *                   ano_lancamento:
 *                     type: integer
 *                   estudio:
 *                     type: string
 *                   episodios:
 *                     type: integer
 *                   classificacao_imdb:
 *                     type: number
 *                   idioma_original:
 *                     type: string
 *                   popularidade:
 *                     type: string
 *                   averageScore:
 *                     type: number
 *       '400':
 *         description: Invalid limit or page parameter
 *       '500':
 *         description: Internal server error
 */
router.get("/top/:limit", async (req, res) => {
  const limit = Number(req.params.limit);
  const page = Number(req.query.page ?? 1);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }

  try {
    const results = await db
      .collection("anime")
      .aggregate([
        {
          $lookup: {
            from: "users",
            let: { animeId: "$id" },
            pipeline: [
              { $unwind: "$avaliacoes" },
              {
                $match: {
                  $expr: { $eq: ["$avaliacoes.item_id", "$$animeId"] },
                },
              },
              {
                $group: {
                  _id: null,
                  averageScore: { $avg: "$avaliacoes.nota" },
                },
              },
            ],
            as: "averageScores",
          },
        },
        {
          $addFields: {
            averageScore: {
              $ifNull: [
                { $arrayElemAt: ["$averageScores.averageScore", 0] },
                null,
              ],
            },
          },
        },
        {
          $sort: { averageScore: -1, id: 1 },
        },
        { $skip: (page - 1) * limit },
        {
          $limit: limit,
        },
      ])
      .toArray();

    return res.status(200).send(results);
  } catch (error) {
    console.error("error: ", error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /anime/ratings/{order}:
 *   get:
 *     summary: Get anime sorted by the number of ratings from users
 *     tags:
 *       - Anime
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
 *         description: A list of anime sorted by the number of ratings from users
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
 *                   estudio:
 *                     type: string
 *                   episodios:
 *                     type: integer
 *                   classificacao_imdb:
 *                     type: number
 *                   idioma_original:
 *                     type: string
 *                   popularidade:
 *                     type: string
 *                   ratingsCount:
 *                     type: integer
 *                   userRatings:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: integer
 *                         nome:
 *                           type: string
 *                         nota:
 *                           type: number
 *                         comentario:
 *                           type: string
 *                         data:
 *                           type: string
 *                           format: date
 */
// router to get the animes sorted by the number of ratings from the users collection
router.get("/ratings/:order", async (req, res) => {
  const order = req.params.order.toString();
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  const isValidOrder = order === "asc" || order === "desc";

  if (!isValidOrder) {
    return res.status(400).send({ error: "Invalid order parameter" });
  }
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).send({ error: "Invalid limit parameter" });
  }

  try {
    const sortOrder = order === "asc" ? 1 : -1;

    const results = await db
      .collection("anime")
      .aggregate([
        {
          $lookup: {
            from: "users",
            let: { animeId: "$id" }, // Store the current anime's id in a variable
            pipeline: [
              // 1. Find users who have reviewed this anime
              {
                $match: {
                  $expr: {
                    $in: [
                      "$$animeId",
                      { $ifNull: ["$avaliacoes.item_id", []] },
                    ],
                  },
                },
              },
              // 2. Split the user's avaliacoes array into separate review objects
              { $unwind: "$avaliacoes" },
              // 3. Keep ONLY the review that matches this specific anime
              {
                $match: {
                  $expr: { $eq: ["$avaliacoes.item_id", "$$animeId"] },
                },
              },
              // 4. Format the output (keeps the reviewer's name, hides email/address)
              {
                $project: {
                  _id: 0,
                  userId: "$id",
                  nome: 1,
                  nota: "$avaliacoes.nota",
                  comentario: "$avaliacoes.comentario",
                  data: "$avaliacoes.data",
                },
              },
            ],
            as: "userRatings",
          },
        },
        {
          $addFields: {
            ratingsCount: { $size: "$userRatings" },
          },
        },
        {
          $sort: { ratingsCount: sortOrder, id: 1 },
        },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ])
      .toArray();

    return res.status(200).send(results);
  } catch (error) {
    console.error("error: ", error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
