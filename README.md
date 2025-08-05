# Juris - Территориальная игра для бегунов

Мобильное приложение для территориальной игры, где команды бегунов захватывают районы города и получают привилегии в партнерских заведениях.

## 🎮 Концепция игры

Приложение позволяет командам бегунов:
- **Захватывать территории** города через физическое присутствие
- **Соревноваться** с другими командами за контроль районов
- **Получать скидки** в кафе и ресторанах на захваченных территориях
- **Отслеживать активность** команды в реальном времени

## 🏗️ Архитектура проекта

```
juris/
├── backend/          # Node.js API сервер (Express + TypeScript)
├── mobile/           # React Native приложение (Expo + TypeScript)
├── docs/            # Документация проекта
└── docker-compose.yml # PostgreSQL + Redis
```

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 22.x+
- npm 10.x+
- Docker (для баз данных)
- Expo Go (для тестирования мобильного приложения)

### Запуск проекта

1. **Клонируйте репозиторий**
```bash
git clone https://github.com/atukenov/juris.git
cd juris
```

2. **Запустите базы данных**
```bash
docker compose up -d
```

3. **Запустите backend**
```bash
cd backend
npm install
npm run dev
```

4. **Запустите мобильное приложение**
```bash
cd mobile
npm install
npm start
```

## 📱 Технологический стек

### Backend
- **Node.js** + **Express.js** - серверная платформа
- **TypeScript** - типобезопасность
- **PostgreSQL** + **PostGIS** - база данных с геопространственными данными
- **Redis** - кеширование и сессии
- **Socket.io** - real-time коммуникация

### Mobile
- **React Native** + **Expo** - кроссплатформенная разработка
- **TypeScript** - типобезопасность
- **React Navigation** - навигация
- **Maps Integration** - работа с картами

### DevOps
- **Docker** - контейнеризация баз данных
- **ESLint** + **Prettier** - качество кода
- **Nodemon** - автоматическая перезагрузка

## 📊 Текущий статус

**Этап 1: Подготовка проекта** - ✅ **95% завершено**
- ✅ Настройка окружения разработки
- ✅ Создание проектов (backend + mobile)
- ✅ Схема базы данных готова

**Этап 2: MVP Backend** - 🟡 **30% завершено**
- ✅ Базовая архитектура Express сервера
- ⏳ Подключение к базе данных
- ⏳ API для аутентификации

Подробный статус см. в [docs/project-status.md](docs/project-status.md)

## 📋 API Endpoints (планируемые)

```
Authentication:
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile

Teams:
GET  /api/teams
POST /api/teams
GET  /api/teams/:id/members

Territories:
GET  /api/territories
POST /api/territories/capture
GET  /api/territories/my
```

## 🗃️ База данных

Схема базы данных включает:
- **Пользователи и команды** - система аутентификации и управления командами
- **Геопространственные данные** - территории с полигонами (PostGIS)
- **Система захватов** - история владения территориями
- **Партнерские заведения** - кафе и рестораны со скидками

## 📖 Документация

- [Технический стек](docs/tech-stack.md) - детальное описание выбранных технологий
- [План разработки](docs/development-plan.md) - поэтапный план с временными рамками
- [Статус проекта](docs/project-status.md) - текущий прогресс и выполненные задачи

## 🤝 Участие в разработке

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE).
