---
title: "How to Extract Markdown from Content Hub Assets for GenAI"
author: "Mark Lowe"
pubDate: 2025-12-22
description: "Convert Content Hub PDFs to LLM-ready Markdown using Azure Service Bus and Python."
authorImage: "../../assets/authors/mark-lowe.jpg"
authorUrl: "https://www.linkedin.com/in/misterlowe/"
socialImage: "../../assets/2025/how-to-extract-markdown-from-content-hub-assets-for-genai/social.png"
---

![How to Extract Markdown from Content Hub Assets for GenAI Hero](../../assets/2025/how-to-extract-markdown-from-content-hub-assets-for-genai/hero.png)

If you're implementing RAG (Retrieval-Augmented Generation) or fine-tuning a model using your company's data, Markdown is the go-to format you'll need. Documents stored in a DAM system are often a great data source for GenAI use cases.

This post we will

1. Create a `Extract Markdown` button in the Content Hub UI
2. Create an Azure Service Bus to connect our code
3. Create Python code that asynchronously extracts Markdown from the asset

### Why Markdown, why not just plain text?

LLMs ♥️ Markdown. This has numerous reasons:

- Document structure makes text easier to be understood for LLMs (and Humans too)
- Markdown retains document structure (headings, lists, paragraphs)
- Markdown uses minimal characters (not like HTML or JSON)
- LLMs are typically trained on vast amounts of Markdown-formatted documents

### Why not use the "Extracted Content" rendition

Content Hub already does a pretty good job extracting text from PDFs. This text is available in the `Extracted Content` rendition on PDF assets. In Pre-AI times, this was enough for keyword-based search etc. but for all the reasons mentioned above, Markdown is the better suited format for GenAI use cases.

## Step 1: Adding an "Extract Markdown" button

Let's add an `Extract Markdown` button on the asset details page.

### Setting up an Azure Queue

First, you'll need to set up an Azure Service Bus Queue. Go to portal.azure.com to set this up and copy the connection string.

### Create a Content Hub Action that writes to the queue

In Content Hub, go to

`Manage > Actions > Add > Type: Azure Service Bus`

- Add the previously copied connection string
- Destination Type: Queue
- Destination: Name of your queue

### Create a button on the Asset Details page

`Manage > Pages > Asset Details > Entity Operations > Add operation`

- Type: External action
- Select your previously created action
- Select `Disable button after click`

> You can test, if this step is working, by clicking the button on some assets and using Service Bus Explorer on the Azure portal to verify if messages are written

## Step 2: Write our python code

First, create a simple python app, that connects to the Azure Service bus and processes messages

```python
import os
import json
import requests
from azure.servicebus import ServiceBusClient
from dotenv import load_dotenv

load_dotenv()

SERVICE_BUS_CONN_STR = os.getenv("AZURE_SERVICE_BUS_CONNECTION_STRING")
QUEUE_NAME = os.getenv("AZURE_QUEUE_NAME")

servicebus_client = ServiceBusClient.from_connection_string(conn_str=SERVICE_BUS_CONN_STR, logging_enable=True)

def process_message(message_body):
    """Process the message and retrieve download URL"""
    try:
        # Parse JSON message
        data = json.loads(message_body)
        target_id = data.get('TargetId')

        if not target_id:
            print("No TargetId found in message")
            return

        print(f"Processing TargetId: {target_id}")

    except json.JSONDecodeError as e:
        print(f"Failed to parse message as JSON: {e}")
    except requests.exceptions.RequestException as e:
        print(f"Error calling Content Hub API: {e}")
    except Exception as e:
        print(f"Error processing message: {e}")

def listen_to_queue():
    print(f"Listening for messages on queue: {QUEUE_NAME}")
    with servicebus_client:
        receiver = servicebus_client.get_queue_receiver(queue_name=QUEUE_NAME)
        with receiver:
            for msg in receiver:
                body = str(msg)
                print(f"Received message: {body}")
                process_message(body)
                receiver.complete_message(msg)

if __name__ == "__main__":
    listen_to_queue()
```

.env file:

```bash
AZURE_SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://....
AZURE_QUEUE_NAME=my-queue-name
```

Install dependencies:

```bash
pip install azure-servicebus requests python-dotenv
```

Run the app:

```bash
python step-2.py
```

If this is running, the script should write `Processing TargetId:` to the console every time a the `Extract Markdown` button was pressed.

## Step 3: Authenticate to Content Hub and extract the Download URL

Extend .env file:

```bash
CONTENTHUB_BASE_URL=https://my-url.sitecorecontenthub.cloud
CONTENTHUB_CLIENT_ID=<create this in Manage > OAuth clients
CONTENTHUB_CLIENT_SECRET=
CONTENTHUB_USERNAME=my-service-user@something
CONTENTHUB_PASSWORD=my-pw
```

```python
import os
import json
import requests
from azure.servicebus import ServiceBusClient
from dotenv import load_dotenv
from docling.document_converter import DocumentConverter,InputFormat,PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions

load_dotenv()

SERVICE_BUS_CONN_STR = os.getenv("AZURE_SERVICE_BUS_CONNECTION_STRING")
QUEUE_NAME = os.getenv("AZURE_QUEUE_NAME")
CONTENTHUB_BASE_URL = os.getenv("CONTENTHUB_BASE_URL")
CONTENTHUB_CLIENT_ID = os.getenv("CONTENTHUB_CLIENT_ID")
CONTENTHUB_CLIENT_SECRET = os.getenv("CONTENTHUB_CLIENT_SECRET")
CONTENTHUB_USERNAME = os.getenv("CONTENTHUB_USERNAME")
CONTENTHUB_PASSWORD = os.getenv("CONTENTHUB_PASSWORD")

servicebus_client = ServiceBusClient.from_connection_string(conn_str=SERVICE_BUS_CONN_STR, logging_enable=True)

def get_contenthub_token():
    """Get OAuth token from Sitecore Content Hub using Resource Owner Password Credentials Grant"""
    token_url = f"{CONTENTHUB_BASE_URL}/oauth/token"

    # Use Resource Owner Password Credentials Grant for non-interactive authentication
    data = {
        'grant_type': 'password',
        'client_id': CONTENTHUB_CLIENT_ID,
        'client_secret': CONTENTHUB_CLIENT_SECRET,
        'username': CONTENTHUB_USERNAME,
        'password': CONTENTHUB_PASSWORD
    }

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }

    response = requests.post(token_url, data=data, headers=headers)
    response.raise_for_status()
    return response.json()['access_token']

def get_original_rendition_url(entity_id, access_token):
    """Retrieve the download URL for the original rendition of an entity"""
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json'
    }

    # Get entity details
    entity_url = f"{CONTENTHUB_BASE_URL}/api/entities/{entity_id}"
    response = requests.get(entity_url, headers=headers)
    response.raise_for_status()
    entity = response.json()

    # Get the renditions dictionary
    renditions = entity.get('renditions', {})

    # Get the downloadOriginal rendition
    download_original = renditions.get('downloadOriginal', [])

    if download_original and len(download_original) > 0:
        download_url = download_original[0].get('href')
        return download_url

def process_message(message_body):
    """Process the message and retrieve download URL"""
    try:
        # Parse JSON message
        data = json.loads(message_body)
        target_id = data.get('TargetId')

        if not target_id:
            print("No TargetId found in message")
            return

        print(f"Processing TargetId: {target_id}")

        # Get Content Hub access token
        access_token = get_contenthub_token()

        # Get download URL
        download_url = get_original_rendition_url(target_id, access_token)

        if download_url:
            print(f"Download URL for entity {target_id}: {download_url}")


        else:
            print(f"No download URL found for entity {target_id}")

    except json.JSONDecodeError as e:
        print(f"Failed to parse message as JSON: {e}")
    except requests.exceptions.RequestException as e:
        print(f"Error calling Content Hub API: {e}")
    except Exception as e:
        print(f"Error processing message: {e}")

def listen_to_queue():
    print(f"Listening for messages on queue: {QUEUE_NAME}")
    with servicebus_client:
        receiver = servicebus_client.get_queue_receiver(queue_name=QUEUE_NAME)
        with receiver:
            for msg in receiver:
                body = str(msg)
                print(f"Received message: {body}")
                process_message(body)
                receiver.complete_message(msg)

if __name__ == "__main__":
    listen_to_queue()
```

Run the script:

```bash
python step-3.py
```

If everything works, it should output a temporary download URL for each asset where the `Extract Markdown` button has been clicked.

## Step 4: Extract Markdown from documents

We're going to use an open source library named [Docling](https://github.com/docling-project/docling) here. Commercial libraries also exist but Docling produces very good results. It does take a lot of time though to convert large documents. (Several minutes if you have over 50 pages). Having this app run asynchronously based on a queue helps with this.

Add the extract_text_from_url function to the script:

```python
def extract_text_from_url(download_url):
    """Extract text from a document URL using Docling"""
    try:
        print(f"Extracting text from URL: {download_url}")

        # Some options to improve speed
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = False
        pipeline_options.do_table_structure = False

        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )

        # Convert the document from URL
        result = converter.convert(download_url)

        # Export to markdown format
        markdown_text = result.document.export_to_markdown()

        print(f"Extracted text (first 500 chars):\n{markdown_text[:500]}...")
        print(f"\nTotal extracted text length: {len(markdown_text)} characters")

        return markdown_text

    except Exception as e:
        print(f"Error extracting text with Docling: {e}")
        return None
```

Install docling dependency:

```bash
pip install docling`
```

The full application code:

```python
import os
import json
import requests
from azure.servicebus import ServiceBusClient
from dotenv import load_dotenv
from docling.document_converter import DocumentConverter,InputFormat,PdfFormatOption 
from docling.datamodel.pipeline_options import PdfPipelineOptions

load_dotenv()

SERVICE_BUS_CONN_STR = os.getenv("AZURE_SERVICE_BUS_CONNECTION_STRING")
QUEUE_NAME = os.getenv("AZURE_QUEUE_NAME")
CONTENTHUB_BASE_URL = os.getenv("CONTENTHUB_BASE_URL")
CONTENTHUB_CLIENT_ID = os.getenv("CONTENTHUB_CLIENT_ID")
CONTENTHUB_CLIENT_SECRET = os.getenv("CONTENTHUB_CLIENT_SECRET")
CONTENTHUB_USERNAME = os.getenv("CONTENTHUB_USERNAME")
CONTENTHUB_PASSWORD = os.getenv("CONTENTHUB_PASSWORD")

servicebus_client = ServiceBusClient.from_connection_string(conn_str=SERVICE_BUS_CONN_STR, logging_enable=True)

def get_contenthub_token():
    """Get OAuth token from Sitecore Content Hub using Resource Owner Password Credentials Grant"""
    token_url = f"{CONTENTHUB_BASE_URL}/oauth/token"

    # Use Resource Owner Password Credentials Grant for non-interactive authentication
    data = {
        'grant_type': 'password',
        'client_id': CONTENTHUB_CLIENT_ID,
        'client_secret': CONTENTHUB_CLIENT_SECRET,
        'username': CONTENTHUB_USERNAME,
        'password': CONTENTHUB_PASSWORD
    }

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }

    response = requests.post(token_url, data=data, headers=headers)
    response.raise_for_status()
    return response.json()['access_token']

def get_original_rendition_url(entity_id, access_token):
    """Retrieve the download URL for the original rendition of an entity"""
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json'
    }

    # Get entity details
    entity_url = f"{CONTENTHUB_BASE_URL}/api/entities/{entity_id}"
    response = requests.get(entity_url, headers=headers)
    response.raise_for_status()
    entity = response.json()

    # Get the renditions dictionary
    renditions = entity.get('renditions', {})

    # Get the downloadOriginal rendition
    download_original = renditions.get('downloadOriginal', [])

    if download_original and len(download_original) > 0:
        download_url = download_original[0].get('href')
        return download_url

def extract_text_from_url(download_url):
    """Extract text from a document URL using Docling"""
    try:
        print(f"Extracting text from URL: {download_url}")

        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = False
        pipeline_options.do_table_structure = False

        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )

        # Convert the document from URL
        result = converter.convert(download_url)

        # Export to markdown format
        markdown_text = result.document.export_to_markdown()

        print(f"Extracted text (first 500 chars):\n{markdown_text[:500]}...")
        print(f"\nTotal extracted text length: {len(markdown_text)} characters")

        return markdown_text

    except Exception as e:
        print(f"Error extracting text with Docling: {e}")
        return None

def process_message(message_body):
    """Process the message and retrieve download URL"""
    try:
        # Parse JSON message
        data = json.loads(message_body)
        target_id = data.get('TargetId')

        if not target_id:
            print("No TargetId found in message")
            return

        print(f"Processing TargetId: {target_id}")

        # Get Content Hub access token
        access_token = get_contenthub_token()

        # Get download URL
        download_url = get_original_rendition_url(target_id, access_token)

        if download_url:
            print(f"Download URL for entity {target_id}: {download_url}")

            # Extract text from the document
            extracted_text = extract_text_from_url(download_url)

            if extracted_text:
                print(f"Successfully extracted text from entity {target_id}")
            else:
                print(f"Failed to extract text from entity {target_id}")

            # TODO: Here you'll probably want to save the extracted text back to a custom field on the asset in Content Hub

        else:
            print(f"No download URL found for entity {target_id}")

    except json.JSONDecodeError as e:
        print(f"Failed to parse message as JSON: {e}")
    except requests.exceptions.RequestException as e:
        print(f"Error calling Content Hub API: {e}")
    except Exception as e:
        print(f"Error processing message: {e}")

def listen_to_queue():
    print(f"Listening for messages on queue: {QUEUE_NAME}")
    with servicebus_client:
        receiver = servicebus_client.get_queue_receiver(queue_name=QUEUE_NAME)
        with receiver:
            for msg in receiver:
                body = str(msg)
                print(f"Received message: {body}")
                process_message(body)
                receiver.complete_message(msg)

if __name__ == "__main__":
    listen_to_queue()
```

## What to do next?

Now it is up to you to do something with the extracted text i.e. write it to a custom field on the Asset or create an `Extracted Markdown` rendition.

I hope this post gives a basic understanding of how to accomplish something like this. For production readiness, you'll want to look into:

- Safeguards for non-extractable assets (images, videos etc.)
- Run this app on a container

<!-- markdownlint-disable MD033 -->
<aside class="about-the-author">
  Mark is a <a href="https://mvp.sitecore.com/en/Directory/Profile?id=e69c0700cf2341992cb208daced6fccc" target="_blank">9x Sitecore MVP</a> based in Switzerland, working in the Sitecore space since 14 years.
</aside>
<!-- markdownlint-enable MD033 -->
