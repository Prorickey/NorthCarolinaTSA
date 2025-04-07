# NCTSA Backend

This is a speedy backend built to serve data to the NCTSA app and manage the event on the app. 
It utilizes redis and postgresql to store data and quickly message other instances of the service.

Postgresql: `docker run --name nctsa-db -p 5432:5432 -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=nctsa -e POSTGRES_USER=nctsa -d postgres:17.4`

Redis: `docker run --name nctsa-redis-db -p 6379:6379 -d redis:7.4`