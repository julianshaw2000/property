$env:PGPASSWORD = "npg_Iz7SaylJ0rhA"

$query = "UPDATE `"Users`" SET `"Role`" = 'SuperAdmin' WHERE `"Email`" = 'julianshaw2000@gmail.com' RETURNING `"Id`", `"Email`", `"Role`", `"IsActive`";"

$connectionString = "postgresql://neondb_owner:npg_Iz7SaylJ0rhA@ep-square-king-abq0rqc5-pooler.eu-west-2.aws.neon.tech:5432/neondb?sslmode=require&options=endpoint%3Dep-square-king-abq0rqc5"

psql $connectionString -c $query
