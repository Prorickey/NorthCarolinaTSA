import pandas as pd
import psycopg2
from psycopg2 import sql
from datetime import datetime

# Function to parse date and time from the CSV format
def parse_datetime(date_str, time_str):
    # Convert date and time strings to a datetime object
    date_format = "%m/%d/%Y"
    time_format = "%I:%M:%S %p"  # 12-hour format with AM/PM
    
    date_obj = datetime.strptime(date_str, date_format)
    time_obj = datetime.strptime(time_str, time_format)
    
    # Combine date and time
    combined_datetime = datetime.combine(
        date_obj.date(),
        time_obj.time()
    )
    
    return combined_datetime

# Database connection
conn = psycopg2.connect(
    database="nctsa",
    host="localhost",
    user="nctsa",
    password="pass",
    port="5432"
)

cursor = conn.cursor()

# Read the CSV file
df = pd.read_csv("./eventSchedule2.csv")

# Process each row in the CSV
for index, row in df.iterrows():
    event_name = row['Event']
    description = row['SchDescription']
    
    # Skip rows with missing essential data
    if pd.isna(event_name) or pd.isna(description) or pd.isna(row['StartDate']):
        continue
    
    # Parse date and times
    start_datetime = parse_datetime(row['StartDate'], row['StartTime'])
    end_datetime = parse_datetime(row['StartDate'], row['EndTime'])
    
    # Determine location (use BlockRoom if available, otherwise HoldRoom)
    location = row['BlockRoom'] if not pd.isna(row['BlockRoom']) else row['HoldRoom']
    if pd.isna(location):
        location = "TBD"  # Default if neither is available
    
    # Look up the event ID
    cursor.execute("SELECT id FROM public.event WHERE name = %s", (event_name,))
    event_id_result = cursor.fetchone()
    
    # If event doesn't exist, create it
    if event_id_result is None:
        print(event_name)
        # Insert the event into the event table
        cursor.execute(
            """INSERT INTO public.event (name, location, "startTime", "endTime") 
               VALUES (%s, 'Conference Center', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id""",
            (event_name,)
        )

        # Get the newly created event ID
        event_id_result = cursor.fetchone()
        if event_id_result is None:
            print(f"Failed to create event for {event_name}. Skipping agenda entry.")
            continue

        cursor.execute(
        """INSERT INTO public.agenda 
           (eventId, title, description, date, endtime, location) 
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (
            event_id_result,
            event_name,  # Title is the event name
            description,  # Description is the schedule description
            start_datetime,  # Date is the start time
            end_datetime,  # End is the end time
            location  # Location is either block room or hold room
        )
    )
    else:
        continue
        #event_id = event_id_result[0]
    
    print(f"Added agenda item for event: {event_name}, {description}")

# Commit the transaction
conn.commit()

# Close the cursor and connection
cursor.close()
conn.close()

print("Import completed successfully!")