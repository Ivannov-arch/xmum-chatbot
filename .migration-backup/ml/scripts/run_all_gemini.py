# scripts/run_all_gemini.py
import subprocess
import glob
import subprocess
import os
import sys
import time

def main():
    target_dir = "database/seeds"
    # Find all text files ending with _raw.txt
    raw_files = glob.glob(os.path.join(target_dir, "*_raw.txt"))

    if not raw_files:
        print(f"No *_raw.txt files found in {target_dir}")
        return
    
    print(f"Found {len(raw_files)} files to process. Starting batch processing...")


    success_count = 0
    for index, file in enumerate(raw_files, 1):
        # Determine output file name
        base_name = os.path.splitext(os.path.basename(file))[0]
        module_name = base_name.replace("_raw", "")
        output_csv = os.path.join(target_dir, f"{module_name}_qa.csv")

        # Check if CSV already exists and has content (greater than 50 bytes for header only)
        if os.path.exists(output_csv) and os.path.getsize(output_csv) > 50:
            print(f"[{index}/{len(raw_files)}] Skipping {file} (CSV already exists and is populated)")
            success_count += 1
            continue

        print(f"\n{'='*60}")
        print(f"[{index}/{len(raw_files)}] Processing: {file}")
        print(f"{'='*60}")

        # Run the existing auto_qna_gemini.py script for each file
        # Using sys.executable ensures it uses the current Python environment (.venv)
        result = subprocess.run([sys.executable, "scripts/auto_qna_gemini.py", file])

        if result.returncode == 0:
            success_count += 1
        else:
            print(f"[WARNING] Process failed for {file}")

        # Add a delay to respect Gemini API rate limits (15 RPM for free tier)
        if index < len(raw_files):
            print("Waiting 10 seconds before the next request to respect rate limits...")
            time.sleep(10)
    
    print(f"\n{'='*60}")
    print(f"Batch processing completed! Successfully processed {success_count} out of {len(raw_files)} files.")

if __name__ == "__main__":
    main() 