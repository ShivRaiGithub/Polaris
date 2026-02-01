# python-server/app.py - SIMPLIFIED VERSION (Only Name, DOB, Gender)

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import os
import numpy as np
import cv2
import re
from datetime import datetime
import tempfile
import traceback

# Import OCR libraries
import easyocr

# Try to import OpenBharatOCR, but don't fail if it's not available
try:
    import openbharatocr
    BHARAT_OCR_AVAILABLE = True
    print("✅ OpenBharatOCR imported (requires Tesseract)")
except ImportError:
    BHARAT_OCR_AVAILABLE = False
    print("⚠️ OpenBharatOCR not available")

app = Flask(__name__)
CORS(app)

# Initialize OCR engines
print("\n🔥 Initializing OCR Engines...")
print("📦 Loading EasyOCR (for ALL documents)...")
easy_reader = easyocr.Reader(['en'], gpu=False)
print("✅ EasyOCR Ready!")
print("🚀 Server ready - NO Tesseract required!\n")


def preprocess_image(image):
    """Preprocess image for better OCR"""
    try:
        img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Resize if too large
        height, width = img.shape[:2]
        if width > 2000:
            scale = 2000 / width
            img = cv2.resize(img, None, fx=scale, fy=scale)
        
        # Grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Adaptive threshold
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        return Image.fromarray(thresh)
    except Exception as e:
        print(f"⚠️ Preprocessing failed: {str(e)}")
        return image


def detect_document_type(text):
    """Smart document type detection"""
    lower = text.lower()
    
    # Aadhaar - comprehensive patterns
    aadhaar_keywords = ['aadhaar', 'आधार', 'uidai', 'unique identification', 
                        'government of india', 'भारत सरकार', 'uid', 'enrollment',
                        'dob:', 'vld', 'vid']
    if any(k in lower for k in aadhaar_keywords):
        # Check for 12-digit number pattern
        if re.search(r'\b\d{4}\s*\d{4}\s*\d{4}\b', text):
            return 'aadhaar'
    
    # PAN - better detection
    pan_keywords = ['income tax', 'permanent account', 'pan', 'आयकर', 
                    'signature', 'पैन', 'father']
    if any(k in lower for k in pan_keywords):
        # Check for PAN number pattern
        if re.search(r'[A-Z]{5}[0-9]{4}[A-Z]', text.upper()):
            return 'pan'
    
    # Driving License
    dl_keywords = ['driving', 'transport', 'licence', 'license', 'dl no', 
                   'motor vehicle', 'vehicle class', 'validity', 'auth to drive']
    if any(k in lower for k in dl_keywords):
        return 'driving_license'
    
    # Passport
    passport_keywords = ['passport', 'nationality', 'date of issue', 'republic of',
                        'surname', 'given name', 'place of birth', 'place of issue']
    if any(k in lower for k in passport_keywords):
        return 'passport'
    
    return 'unknown'


def extract_aadhaar_with_easyocr(image):
    """Extract Aadhaar details using ONLY EasyOCR - Name, DOB, Gender only"""
    print("🇮🇳 Using EasyOCR for Aadhaar (No Tesseract needed)...")
    
    img_array = np.array(image)
    results = easy_reader.readtext(img_array)
    
    text_lines = [text for (bbox, text, prob) in results if prob > 0.3]
    full_text = ' '.join(text_lines)
    
    print(f"📝 Extracted Text: {full_text[:200]}...")
    
    data = {
        'name': 'Not found',
        'dob': 'Not found',
        'age': None,
        'gender': '',
        'idType': 'aadhaar'
    }

    # Extract name (usually appears after "Government of India" or before DOB)
    for i, line in enumerate(text_lines):
        # Skip common headers
        if any(skip in line.lower() for skip in ['government', 'india', 'aadhaar', 'male', 'female']):
            continue
        # Name is usually 2-4 words, all caps or title case
        if len(line.split()) >= 2 and len(line.split()) <= 4:
            if any(char.isalpha() for char in line):
                data['name'] = line
                print(f"✅ Found Name: {data['name']}")
                break

    # Extract DOB (look for date patterns after "DOB:" or "D.O.B")
    dob_patterns = [
        r'(?:dob|d\.o\.b)[\s:]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})',
        r'\b(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\b'
    ]
    
    for pattern in dob_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            dob_str = match.group(1) if match.lastindex else match.group(0)
            data['dob'] = dob_str.replace('.', '/').replace('-', '/')
            
            # Calculate age
            try:
                for fmt in ['%d/%m/%Y', '%m/%d/%Y']:
                    try:
                        dob_obj = datetime.strptime(data['dob'], fmt)
                        data['age'] = datetime.now().year - dob_obj.year
                        print(f"✅ Found DOB: {data['dob']} (Age: {data['age']})")
                        break
                    except:
                        continue
            except:
                pass
            break
    
    # Extract Gender
    if 'male' in full_text.lower():
        if 'female' in full_text.lower():
            data['gender'] = 'Female'
        else:
            data['gender'] = 'Male'
        print(f"✅ Found Gender: {data['gender']}")
            
    return data


def extract_pan_with_easyocr(image):
    """Extract PAN details using ONLY EasyOCR - Name, DOB, Gender only"""
    print("💳 Using EasyOCR for PAN (No Tesseract needed)...")
    
    img_array = np.array(image)
    results = easy_reader.readtext(img_array)
    
    text_lines = [text for (bbox, text, prob) in results if prob > 0.3]
    full_text = ' '.join(text_lines)
    
    print(f"📝 Extracted Text: {full_text[:200]}...")
    
    data = {
        'name': 'Not found',
        'dob': 'Not found',
        'age': None,
        'gender': '',
        'idType': 'pan'
    }

    # Extract name (usually appears prominently)
    for line in text_lines:
        if len(line.split()) >= 2 and len(line.split()) <= 4:
            if any(char.isalpha() for char in line) and 'income' not in line.lower() and 'tax' not in line.lower():
                data['name'] = line.upper()
                print(f"✅ Found Name: {data['name']}")
                break

    # Extract DOB
    dob_match = re.search(r'\b(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\b', full_text)
    if dob_match:
        data['dob'] = dob_match.group(0).replace('.', '/').replace('-', '/')
        try:
            for fmt in ['%d/%m/%Y', '%m/%d/%Y']:
                try:
                    dob_obj = datetime.strptime(data['dob'], fmt)
                    data['age'] = datetime.now().year - dob_obj.year
                    print(f"✅ Found DOB: {data['dob']} (Age: {data['age']})")
                    break
                except:
                    continue
        except:
            pass
    
    # Extract Gender (PAN doesn't have gender, but check if mentioned)
    if 'male' in full_text.lower():
        if 'female' in full_text.lower():
            data['gender'] = 'Female'
        else:
            data['gender'] = 'Male'
        print(f"✅ Found Gender: {data['gender']}")
            
    return data


def extract_dl_with_easyocr(image):
    """Extract Driving License using EasyOCR - Name, DOB, Gender only"""
    print("🚘 Using EasyOCR for Driving License...")
    
    img_array = np.array(image)
    results = easy_reader.readtext(img_array)
    
    text_lines = [text for (bbox, text, prob) in results if prob > 0.3]
    full_text = ' '.join(text_lines)
    
    print(f"📝 Extracted Text: {full_text[:200]}...")
    
    data = {
        'name': 'Not found',
        'dob': 'Not found',
        'age': None,
        'gender': '',
        'idType': 'driving_license'
    }

    # Extract name
    for i, line in enumerate(text_lines):
        if any(k in line.lower() for k in ['name', 'holder']):
            if i + 1 < len(text_lines):
                data['name'] = text_lines[i + 1]
                print(f"✅ Found Name: {data['name']}")
                break

    # Extract DOB
    dob_match = re.search(r'\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})\b', full_text)
    if dob_match:
        data['dob'] = dob_match.group(0)
        try:
            year = int(dob_match.group(3))
            data['age'] = datetime.now().year - year
            print(f"✅ Found DOB: {data['dob']} (Age: {data['age']})")
        except:
            pass
    
    # Extract Gender
    if 'male' in full_text.lower():
        if 'female' in full_text.lower():
            data['gender'] = 'Female'
        else:
            data['gender'] = 'Male'
        print(f"✅ Found Gender: {data['gender']}")
            
    return data


def extract_passport_with_easyocr(image):
    """Extract Passport using EasyOCR - Name, DOB, Gender only"""
    print("🌍 Using EasyOCR for Passport...")
    
    img_array = np.array(image)
    results = easy_reader.readtext(img_array)
    
    text_lines = [text for (bbox, text, prob) in results if prob > 0.4]
    full_text = ' '.join(text_lines)
    
    print(f"📝 Extracted Text: {full_text[:200]}...")
    
    data = {
        'name': 'Not found',
        'dob': 'Not found',
        'age': None,
        'gender': '',
        'idType': 'passport'
    }
    
    # Extract name
    for i, line in enumerate(text_lines):
        if 'name' in line.lower() or 'surname' in line.lower():
            if i + 1 < len(text_lines):
                data['name'] = text_lines[i + 1]
                print(f"✅ Found Name: {data['name']}")
                break
    
    # Extract DOB
    dob_match = re.search(r'\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b', full_text)
    if dob_match:
        data['dob'] = f"{dob_match.group(1)}/{dob_match.group(2)}/{dob_match.group(3)}"
        data['age'] = datetime.now().year - int(dob_match.group(3))
        print(f"✅ Found DOB: {data['dob']} (Age: {data['age']})")
    
    # Gender
    if 'male' in full_text.lower() and 'female' not in full_text.lower():
        data['gender'] = 'Male'
    elif 'female' in full_text.lower():
        data['gender'] = 'Female'
        print(f"✅ Found Gender: {data['gender']}")
    
    return data


@app.route('/extract', methods=['POST'])
def extract_document():
    """Main extraction endpoint - ONLY extracts Name, DOB, Gender"""
    temp_files = []
    
    try:
        # Check if files were uploaded
        if 'images' not in request.files and 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No images uploaded'}), 400
        
        # Get document type from request (1=Aadhaar, 2=PAN, 3=DL, 4=Passport)
        doc_type_code = request.form.get('docType', '1')
        doc_type_map = {
            '1': 'aadhaar',
            '2': 'pan',
            '3': 'driving_license',
            '4': 'passport'
        }
        doc_type = doc_type_map.get(doc_type_code, 'aadhaar')
        
        # Support both single and multiple files
        files = request.files.getlist('images') if 'images' in request.files else [request.files['image']]
        
        if not files or all(f.filename == '' for f in files):
            return jsonify({'success': False, 'error': 'No files selected'}), 400
        
        print(f"\n📸 Processing {len(files)} file(s)...")
        print(f"📋 Document Type: {doc_type.upper()} (Code: {doc_type_code})")
        
        all_results = []
        
        for idx, file in enumerate(files):
            print(f"\n--- Processing File {idx + 1}/{len(files)}: {file.filename} ---")
            
            try:
                # Read image
                image = Image.open(io.BytesIO(file.read())).convert('RGB')
                
                # Route to appropriate extraction function based on user-selected type
                print(f"🔍 Processing as {doc_type.upper()}...")
                
                if doc_type == 'aadhaar':
                    extracted_data = extract_aadhaar_with_easyocr(image)
                elif doc_type == 'pan':
                    extracted_data = extract_pan_with_easyocr(image)
                elif doc_type == 'driving_license':
                    extracted_data = extract_dl_with_easyocr(image)
                elif doc_type == 'passport':
                    extracted_data = extract_passport_with_easyocr(image)
                else:
                    raise Exception(f"Unsupported document type: {doc_type}")
                
                print("✅ Extraction complete!")
                print(f"👤 Name: {extracted_data.get('name')}")
                print(f"📅 DOB: {extracted_data.get('dob')}")
                print(f"⚧ Gender: {extracted_data.get('gender')}")
                
                all_results.append({
                    'success': True,
                    'filename': file.filename,
                    'data': extracted_data
                })
                
            except Exception as file_error:
                print(f"❌ Error processing file {file.filename}: {str(file_error)}")
                traceback.print_exc()
                all_results.append({
                    'success': False,
                    'filename': file.filename,
                    'error': f'Processing error: {str(file_error)}'
                })
        
        # Return results
        successful_extractions = [r for r in all_results if r['success']]
        failed_extractions = [r for r in all_results if not r['success']]
        
        if not successful_extractions:
            return jsonify({
                'success': False,
                'error': 'Failed to extract data from any uploaded files',
                'details': failed_extractions
            }), 400
        
        return jsonify({
            'success': True,
            'results': all_results,
            'summary': {
                'total': len(all_results),
                'successful': len(successful_extractions),
                'failed': len(failed_extractions)
            }
        })
    
    except Exception as e:
        print(f"❌ Server Error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500
    
    finally:
        # Clean up temp files
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                    print(f"🗑️ Cleaned up temp file: {temp_file}")
                except:
                    pass


@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'ok',
        'easyocr': 'available',
        'tesseract_required': False,
        'note': 'Using EasyOCR only - Extracts Name, DOB, Gender only!'
    })


if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 ZK ID VERIFIER SERVER - SIMPLIFIED VERSION")
    print("="*60)
    print(f"📍 Server:  http://localhost:5000")
    print(f"💊 Health:  http://localhost:5000/health")
    print(f"🌍 EasyOCR:   ✅ Ready (NO Tesseract needed!)")
    print(f"💡 Extracts:  Name, DOB, Gender ONLY")
    print(f"📄 Works with: Aadhaar, PAN, DL, Passport")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)