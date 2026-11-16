import dotenv from 'dotenv';
import {app} from './app.js';

dotenv.config({
    path: './.env'
})



app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`LedgerGuard backend is running at http://localhost:${process.env.PORT || 3000}`);
});
