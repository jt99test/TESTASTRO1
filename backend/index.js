require('dotenv').config()
const express = require('express')
const cors = require('cors')
const readingRoute = require('./routes/reading')
const aiRoute = require('./routes/ai')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/api/reading', readingRoute)
app.use('/api/ai', aiRoute)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`Sarita backend running on port ${PORT}`)
})
