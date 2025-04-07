import random
import string
import pandas as pd
import psycopg2
from psycopg2 import sql
import re

df = pd.read_csv("./participants.csv")

conn = psycopg2.connect(
    database="nctsa",
    host="localhost",
    user="nctsa",
    password="pass",
    port="5432")

cursor = conn.cursor()

for index, row in df.iterrows():
    tsaId = row['Participant ID']
    firstName = row["First Name"]
    lastName = row["Last Name"]
    school = row["School"]
    chapterId = row["ChapterID"]

    privateCode = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    # Insert school if not exists
    cursor.execute("""INSERT INTO public.school (tsaId, schoolName, privateCode) 
                      VALUES (%s, %s, %s) 
                      ON CONFLICT (tsaId) DO NOTHING 
                      RETURNING id""",
                   (chapterId, school, privateCode,))
    schoolId = cursor.fetchone()
    if schoolId is None:
        cursor.execute("SELECT id FROM public.school WHERE tsaId = %s", (chapterId,))
        schoolId = cursor.fetchone()
    schoolId = schoolId[0]

    if firstName == "":
        firstName = "Judge/Volunteer"
        lastName = "TSA"

    # Insert user
    print(tsaId)
    cursor.execute("""INSERT INTO public.users (tsaId, shortName, fullName, schoolId) 
                      VALUES (%s, %s, %s, %s) 
                      RETURNING id""",
                   (tsaId, firstName, f"{firstName} {lastName}", schoolId,))
    
    userId = cursor.fetchone()[0]
    
    events = []
    evts = [row["Event1"], row["Event2"], row["Event3"], row["Event4"], row["Event5"]]
    for evt in evts:
        if isinstance(evt, str):
            match = re.match(r"^(.*?)\s+(?:Team|Group)?\s*\d+$", evt)
            if match:
                events.append(match.group(1))

    for event in events:
        # Create the event if it doesn't exist, and then add the user to the event
        cursor.execute("SELECT id FROM public.event WHERE name = %s", (event,))
        eventId = cursor.fetchone()
        if eventId is None:
            cursor.execute("""INSERT INTO public.event (name, location, "startTime", "endTime") 
                            VALUES (%s, 'Conference Center', NOW(), NOW() + INTERVAL '1 hour') 
                            RETURNING id""",
                        (event,))
            eventId = cursor.fetchone()
        eventId = eventId[0]

        cursor.execute("""INSERT INTO public.user_event (userid, eventid)
                            VALUES (%s, %s)""",
                         (userId, eventId))
        
        cursor.execute("""INSERT INTO public.user_agenda (userid, eventid)
                            VALUES (%s, %s)""",
                         (userId, eventId))
    
    # Commit the transaction
    conn.commit()

# Close the cursor and connection
cursor.close()
conn.close()