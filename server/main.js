// Подключаем необходимые модули
const express = require("express");
const bodyParser = require('body-parser');
const app = express();
const http = require("http").Server(app);
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const localIpV4Address = require("local-ipv4-address");
const os = require("os");
const dirname = process.cwd();
const uploadsFolder = path.join(os.homedir(), "HomeCloud");

// Подключаем модуль для работы с PostgreSQL
const { Pool } = require('pg');

// Создаем пул соединений к базе данных PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'your_database_name',
  password: 'admin',
  port: 5432, // Порт PostgreSQL
});

// Middleware
app.use(express.json());
app.use(cors());

// Создаем папку для загрузок, если она не существует
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(path.join(os.homedir(), "HomeCloud"));
}

// Любые POST-запросы будут обрабатываться следующим файлом
const posts = require("./routes/posts");
app.use("/posts", posts);

// Служим статические файлы
app.use(express.static(path.join(dirname, "server", "public")));

// Обработка POST-запроса для входа в систему
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const client = await pool.connect();

    // Предполагается, что у вас есть таблица "users" с полями "username" и "password"
    const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length > 0) {
      // Проверяем пароль из базы данных
      const dbPassword = result.rows[0].password;

      if (password === dbPassword) {
          // Аутентификация успешна
          res.json({ success: true, data: { message: 'Аутентификация успешна' } });
        } else {
          // Аутентификация не удалась
          res.status(401).json({ success: false, data: { message: 'Неверное имя пользователя или пароль' } });
        }
    } else {
      // Пользователь с таким именем не найден
      res.status(401).json({ success: false, data: { message: 'Неверное имя пользователя или пароль' } });
    }

    client.release();
  } catch (err) {
    console.error('Ошибка выполнения запроса', err);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Обработка всех остальных маршрутов
app.get("/.*/", (req, res) => {
  res.sendFile(path.join(dirname, "server", "public", "index.html"));
});

// Слушаем порт 5000
const port = process.env.PORT || 5000;
http.listen(port, "0.0.0.0", () => {
  localIpV4Address().then(function (ipAddress) {
    console.log(`Веб-сайт доступен по адресу: ${ipAddress}:${port}`);
  });
});
