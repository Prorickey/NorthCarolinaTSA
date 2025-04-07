import csv
import uuid
import psycopg2
from datetime import datetime
import psycopg2.extras

# File path - replace with your actual CSV file path
file_path = "participants2.csv"

# Database connection parameters - replace with your actual database credentials
db_params = {
    "host": "localhost",
    "database": "nctsa",
    "user": "nctsa",
    "password": "pass"
}

# Lists to store unique advisors and their associated IDs
unique_advisors = []
advisor_tsa_ids = {}

# First pass: Get all unique advisor names
with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        advisor_name = row.get('AdvisorName', '').strip()
        if advisor_name and advisor_name not in unique_advisors:
            unique_advisors.append(advisor_name)
            advisor_tsa_ids[advisor_name] = []

# Second pass: Match TSA IDs based on first and last name matching advisor name
with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        first_name = row.get('First Name', '').strip()
        last_name = row.get('Last Name', '').strip()
        participant_id = row.get('Participant ID', '').strip()
        
        # Create the full name in the format that might match an advisor name
        full_name = f"{first_name} {last_name}".strip()
        
        # Check if this person's name matches any advisor name
        for advisor in unique_advisors:
            # Check if the full name matches the advisor name
            if advisor == full_name:
                if participant_id and participant_id not in advisor_tsa_ids[advisor]:
                    advisor_tsa_ids[advisor].append(participant_id)

# Flatten the list of all advisor TSA IDs
all_advisor_tsa_ids = []
for ids in advisor_tsa_ids.values():
    all_advisor_tsa_ids.extend(ids)

# Remove duplicates
all_advisor_tsa_ids = list(set(all_advisor_tsa_ids))

# Connect to the database and update the notification
try:
    conn = psycopg2.connect(**db_params)
    cursor = conn.cursor()
    
    # Get all user IDs based on the TSA IDs
    user_ids = []
    for tsa_id in all_advisor_tsa_ids:
        # Convert to integer if possible, as tsaId in the schema is INTEGER
        try:
            tsa_id_int = int(tsa_id)
            cursor.execute("SELECT id FROM public.users WHERE tsaId = %s", (tsa_id_int,))
            result = cursor.fetchone()
            if result:
                user_ids.append(result[0])  # Append the UUID
        except ValueError:
            print(f"Warning: Could not convert TSA ID '{tsa_id}' to integer")

    # Update the notification record to add these user IDs
    notification_id = 'c74a9902-ac59-44c0-95bc-6d7c9fd2eeee'

    psycopg2.extras.register_uuid()

    for i in range(len(user_ids)):
        print(f"Converting user ID {user_ids[i]} to UUID format")
        user_ids[i] = uuid.UUID(user_ids[i])
    
    # Update the notification record
    cursor.execute(
        "UPDATE public.notifications SET userids = %s WHERE id = %s",
        (user_ids, notification_id)
    )
    
    # Commit the changes
    conn.commit()
    
    print(f"\nFound {len(unique_advisors)} unique advisors")
    print(f"Collected {len(all_advisor_tsa_ids)} TSA IDs associated with advisors")
    print(f"Updated notification {notification_id} with {len(user_ids)} user IDs")
    
except Exception as e:
    print(f"Database error: {e}")
    
finally:
    if conn:
        cursor.close()
        conn.close()