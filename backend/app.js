import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
const app = express()

app.use(express.json());

app.get('/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);


const port = 3000
app.get('/', (req, res) => {
 res.send('Backend!')
})
app.listen(port, () => {
 console.log(`backend listening on port ${port}`)
})

