import random
import string
import time
import pandas as pd
import psycopg2
from psycopg2 import sql

csv_file = "./data.csv"

def tsaIdGen():
    return "2" + str(random.randint(1000000, 9999999))

def emailGen():
    user = ''.join(random.choices(string.ascii_letters, k=5))
    return user + "@prorickey.xyz"

chapterId = [1024, 2048, 3072, 4096]

level = 2
schools = [
    (2222, "NC School Of Science & Math", "1219 Broad Street", "Durham", "NC", 27519, "Amber Smith", "amber.smith@ncssm.edu"),
    (2221, "Panther Creek High School", "6770 McCrimmon Pkwy", "Cary", "NC", 27519, "Emerson Lawrence", "elawrence4@wcpss.net")
]

data = pd.read_csv(csv_file)

firstNames = data["First Name"].to_list()
lastNames = data["Last Name"].to_list()

events = data[['Event1', 'Event2', 'Event3', 'Event4', 'Event5']].values.flatten()
events = pd.unique(events)
events = [event for event in events if str(event) != 'nan']

def eventsGen():
    evts = []
    for _ in range(random.randint(1, 5)):
        evts.append(events[random.randint(0, len(events)-2)])

    return evts

conn = psycopg2.connect(
    database="nctsa",
    host="localhost",
    user="nctsa",
    password="pass",
    port="5432")

cursor = conn.cursor()

num_entries = 5000

for i in range(num_entries):
    tsaId = tsaIdGen()
    cursor.execute("SELECT id FROM public.users WHERE tsaId = %s", (tsaId,))
    if cursor.fetchone() is not None:
        continue
    firstName = firstNames[random.randint(0, len(firstNames) - 1)]
    lastName = lastNames[random.randint(0, len(lastNames) - 1)]
    fullName = f"{firstName} {lastName}"
    shortName = f"{firstName[0]}.{lastName}"
    email = emailGen()
    school = random.choice(schools)
    schoolTsaId, schoolName, address, city, state, zipCode, advisorName, advisorEmail = school
    privateCode = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    userId = None

    # Insert school if not exists
    cursor.execute("""INSERT INTO public.school (tsaId, schoolName, privateCode) 
                      VALUES (%s, %s, %s) 
                      ON CONFLICT (tsaId) DO NOTHING 
                      RETURNING id""",
                   (schoolTsaId, schoolName, privateCode))
    schoolId = cursor.fetchone()
    if schoolId is None:
        cursor.execute("SELECT id FROM public.school WHERE tsaId = %s", (schoolTsaId,))
        schoolId = cursor.fetchone()
    schoolId = schoolId[0]

    # Insert user
    cursor.execute("""INSERT INTO public.users (tsaId, shortName, fullName, email, schoolId) 
                      VALUES (%s, %s, %s, %s, %s) 
                      RETURNING id""",
                   (tsaId, shortName, fullName, email, schoolId))
    userId = cursor.fetchone()[0]

    # Generate and insert user events
    userEvents = eventsGen()
    for event in userEvents:
        cursor.execute("SELECT id FROM public.event WHERE name = %s", (event,))
        eventId = cursor.fetchone()
        if eventId is None:
            cursor.execute("INSERT INTO public.event (name, location, \"startTime\", \"endTime\") VALUES (%s, 'Conference Center', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id", (event,))
            eventId = cursor.fetchone()
        eventId = eventId[0]
        cursor.execute("""INSERT INTO public.user_event (userId, eventId) 
                          VALUES (%s, %s) 
                          ON CONFLICT (userId, eventId) DO NOTHING""",
                       (userId, eventId))

    # Generate and insert user token
    cursor.execute("""INSERT INTO public.user_tokens (userId) 
                      VALUES (%s) 
                      RETURNING id""",
                   (userId,))

# Commit the transaction
conn.commit()

# Close the cursor and connection
cursor.close()
conn.close()