import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(file_path):
    try:
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            xml_content = zip_ref.read('word/document.xml')

        tree = ET.fromstring(xml_content)

        # Define namespace
        namespaces = {
            'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
            'w14': 'http://schemas.microsoft.com/office/word/2010/wordml'
        }

        # Extract all text
        text_elements = tree.findall('.//w:t', namespaces)
        text = ''.join([elem.text for elem in text_elements if elem.text])

        print(text)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    read_docx("docs/GRN.docx")
