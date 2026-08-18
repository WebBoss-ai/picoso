
Base URL

All API endpoints are relative to this base URL.

https://service.api.campaignbot.online
Copy
Authentication

Include your API key in the request header.

Authorization: Bearer <api_key>
Send Message API
Unified API to send WhatsApp messages including text, media, and template messages.

POST
/v1/whatsapp/message/send
Common Request Fields (All Message Types)
Common request fields required for all message types (text, template, media).

Request Structure

What you need to send
recipientPhone

Recipient Phone

string
This value is used to define the recipient phone when sending the message.
+919999999999
recipientName

Recipient Name

string
This value is used to define the recipient name when sending the message.
Tanmoy (optional)
messageType

Message Type

string
This value is used to define the message type when sending the message.
text | template | image | video | audio | document
JSON to send

{
  "recipientPhone": "+919999999999",
  "recipientName": "Tanmoy (optional)",
  "messageType": "text | template | image | video | audio | document"
}
Success

 {
  "statusCode": 200,
  "message": "Message sent successfully.",
  "payload": {
    "messageId": "wamid.HBgMOTE5OTk5OTk5OTk5FQIAERgS..."
  }
}
Error

 {
  "status": false,
  "statusCode": 400,
  "message": "Validation error"
}
POST

POST
/api/message/send
Send Text Message
Send a simple text message to a WhatsApp user.

Request Structure

What you need to send
recipientPhone

Recipient Phone

string
This value is used to define the recipient phone when sending the message.
+919999999999
recipientName

Recipient Name

string
This value is used to define the recipient name when sending the message.
Tanmoy
messageType

Message Type

string
This value is used to define the message type when sending the message.
text
messageContent

Message Content

string
This value is used to define the message content when sending the message.
Hello! This is a test message
replyToMessageId

Reply To Message Id

object
This value is used to define the reply to message id when sending the message.
{ "id": "wamid.HBg..." }
JSON to send

{
  "recipientPhone": "+919999999999",
  "recipientName": "Tanmoy",
  "messageType": "text",
  "messageContent": "Hello! This is a test message",
  "replyToMessageId": {
    "id": "wamid.HBg..."
  }
}
Success

 {
  "statusCode": 200,
  "message": "Message sent successfully.",
  "payload": {
    "messageId": "wamid.HBg..."
  }
}
Error

 {
  "status": false,
  "statusCode": 400,
  "message": "messageContent is missing"
}

POST
/api/message/send
Send Media Message (Image / Video / Audio / Document)
Send media messages using media object ID from Meta.

Request Structure

What you need to send
recipientPhone

Recipient Phone

string
This value is used to define the recipient phone when sending the message.
+919999999999
recipientName

Recipient Name

string
This value is used to define the recipient name when sending the message.
Tanmoy
messageType

Message Type

string
This value is used to define the message type when sending the message.
image
mediaUrl

Media Url

string
This value is used to define the media url when sending the message.
MEDIA_OBJECT_ID_FROM_META
caption

Caption

string
This value is used to define the caption when sending the message.
Check this image
filename

Filename

string
This value is used to define the filename when sending the message.
invoice.pdf (Only for document type)
JSON to send

{
  "recipientPhone": "+919999999999",
  "recipientName": "Tanmoy",
  "messageType": "image",
  "mediaUrl": "MEDIA_OBJECT_ID_FROM_META",
  "caption": "Check this image",
  "filename": "invoice.pdf (Only for document type)"
}
Success

 {
  "statusCode": 200,
  "message": "Message sent successfully.",
  "payload": {
    "messageId": "wamid.HBg..."
  }
}
Error

 {
  "status": false,
  "statusCode": 400,
  "message": "mediaUrl is missing"
}

POST
/api/message/send
Send Template Message (Basic)
Send a WhatsApp template message.

Request Structure

What you need to send
recipientPhone

Recipient Phone

string
This value is used to define the recipient phone when sending the message.
+919999999999
recipientName

Recipient Name

string
This value is used to define the recipient name when sending the message.
Tanmoy
messageType

Message Type

string
This value is used to define the message type when sending the message.
template
templateName

Template Name

string
This value is used to define the template name when sending the message.
order_update
languageCode

Language Code

string
This value is used to define the language code when sending the message.
en_US
templateParams

Template Params

array
This value is used to define the template params when sending the message.
[ "Tanmoy", "ORD-1234" ]
JSON to send

{
  "recipientPhone": "+919999999999",
  "recipientName": "Tanmoy",
  "messageType": "template",
  "templateName": "order_update",
  "languageCode": "en_US",
  "templateParams": [
    "Tanmoy",
    "ORD-1234"
  ]
}
Success

 {
  "statusCode": 200,
  "message": "Message sent successfully.",
  "payload": {
    "messageId": "wamid.HBg..."
  }
}
Error

 {
  "status": false,
  "statusCode": 400,
  "message": "templateName is missing"
}

POST
/api/message/send
Template with Dynamic Header (Text)
Template message with dynamic text header.

Request Structure

What you need to send
recipientPhone

Recipient Phone

string
This value is used to define the recipient phone when sending the message.
+919999999999
messageType

Message Type

string
This value is used to define the message type when sending the message.
template
templateName

Template Name

string
This value is used to define the template name when sending the message.
order_update
languageCode

Language Code

string
This value is used to define the language code when sending the message.
en_US
dynamicHeader

Dynamic Header

object
This value is used to define the dynamic header when sending the message.
{ "type": "text", "text": "Order Alert" }
templateParams

Template Params

array
This value is used to define the template params when sending the message.
[ "Tanmoy", "ORD-1234" ]
JSON to send

{
  "recipientPhone": "+919999999999",
  "messageType": "template",
  "templateName": "order_update",
  "languageCode": "en_US",
  "dynamicHeader": {
    "type": "text",
    "text": "Order Alert"
  },
  "templateParams": [
    "Tanmoy",
    "ORD-1234"
  ]
}
Success

 {
  "statusCode": 200,
  "message": "Message sent successfully.",
  "payload": {
    "messageId": "wamid.HBg..."
  }
}
Error

 {
  "status": false,
  "statusCode": 400,
  "message": "dynamicHeader invalid"
}

POST
/api/message/send
Template with Media Header
Template message with image, video, or document header.

Request Structure

What you need to send
recipientPhone

Recipient Phone

string
This value is used to define the recipient phone when sending the message.
+919999999999
messageType

Message Type

string
This value is used to define the message type when sending the message.
template
templateName

Template Name

string
This value is used to define the template name when sending the message.
invoice_template
languageCode

Language Code

string
This value is used to define the language code when sending the message.
en_US
dynamicHeader

Dynamic Header

object
This value is used to define the dynamic header when sending the message.
{ "type": "document", "mediaId": "MEDIA_ID_FROM_META", "filename": "invoice_july.pdf", "mediaSize": 1048576 }
templateParams

Template Params

array
This value is used to define the template params when sending the message.
[ "INV-7890" ]
JSON to send

{
  "recipientPhone": "+919999999999",
  "messageType": "template",
  "templateName": "invoice_template",
  "languageCode": "en_US",
  "dynamicHeader": {
    "type": "document",
    "mediaId": "MEDIA_ID_FROM_META",
    "filename": "invoice_july.pdf",
    "mediaSize": 1048576
  },
  "templateParams": [
    "INV-7890"
  ]
}
Success

 {
  "statusCode": 200,
  "message": "Message sent successfully.",
  "payload": {
    "messageId": "wamid.HBg..."
  }
}
Error

 {
  "status": false,
  "statusCode": 400,
  "message": "mediaId missing"
}
POST
/api/message/send
Template with Dynamic URL Button
Template message with dynamic URL button parameters.

Request Structure

What you need to send
recipientPhone

Recipient Phone

string
This value is used to define the recipient phone when sending the message.
+919999999999
messageType

Message Type

string
This value is used to define the message type when sending the message.
template
templateName

Template Name

string
This value is used to define the template name when sending the message.
payment_reminder
languageCode

Language Code

string
This value is used to define the language code when sending the message.
en_US
templateParams

Template Params

array
This value is used to define the template params when sending the message.
[ "Tanmoy", "₹999" ]
dynamicButtons

Dynamic Buttons

array
This value is used to define the dynamic buttons when sending the message.
[ { "type": "url", "index": 0, "variableValue": "ORD-1234" } ]
JSON to send

{
  "recipientPhone": "+919999999999",
  "messageType": "template",
  "templateName": "payment_reminder",
  "languageCode": "en_US",
  "templateParams": [
    "Tanmoy",
    "₹999"
  ],
  "dynamicButtons": [
    {
      "type": "url",
      "index": 0,
      "variableValue": "ORD-1234"
    }
  ]
}
Success

 {
  "statusCode": 200,
  "message": "Message sent successfully.",
  "payload": {
    "messageId": "wamid.HBg..."
  }
}
Error

 {
  "status": false,
  "statusCode": 400,
  "message": "dynamicButtons invalid"
}

POST
/api/message/send
Common Error Responses
Standard error responses returned by the API.

Success

 {}
Error

 {
  "unauthorized": {
    "status": false,
    "statusCode": 401,
    "message": "Unauthorized: business_ref_id / whatsapp_ref_id missing"
  },
  "missingRecipient": {
    "status": false,
    "statusCode": 400,
    "message": "recipientPhone is missing"
  },
  "missingMessageType": {
    "status": false,
    "statusCode": 400,
    "message": "messageType is missing"
  }
}

Send Bulk Message API
API to send bulk WhatsApp template messages as a campaign with multiple recipients.

POST
/v1/whatsapp/messages/bulk/send

Send Bulk Template Message
Send bulk WhatsApp template messages using a campaign and multiple recipients.

Request Structure

What you need to send
templateId

Template Id

string
This value is used to define the template id when sending the message.
1610629016778422
templateName

Template Name

string
This value is used to define the template name when sending the message.
order_update
campaignName

Campaign Name

string
This value is used to define the campaign name when sending the message.
Order Update Campaign
campaignDescription

Campaign Description

string
This value is used to define the campaign description when sending the message.
Order status update for customers
languageCode

Language Code

string
This value is used to define the language code when sending the message.
en_US
recipients

Recipients

array
This value is used to define the recipients when sending the message.
[ { "phone": "+919999999999", "name": "Tanmoy", "templateParams": [ "Tanmoy", "ORD-1234" ] }, { "phone": "+918888888888", "name": "Saikat", "templateParams": [ "Amit", "ORD-5678" ] } ]
JSON to send

{
  "templateId": "1610629016778422",
  "templateName": "order_update",
  "campaignName": "Order Update Campaign",
  "campaignDescription": "Order status update for customers",
  "languageCode": "en_US",
  "recipients": [
    {
      "phone": "+919999999999",
      "name": "Tanmoy",
      "templateParams": [
        "Tanmoy",
        "ORD-1234"
      ]
    },
    {
      "phone": "+918888888888",
      "name": "Saikat",
      "templateParams": [
        "Amit",
        "ORD-5678"
      ]
    }
  ]
}
Success

 {
  "statusCode": 200,
  "message": "Bulk messages enqueued successfully (200 recipients)",
  "payload": {
    "campaignRefId": "cmp_abc123xyz",
    "enqueuedCount": 200
  }
}
Error

 {
  "status": false,
  "statusCode": 400,
  "message": "recipients is missing"
}
POST
/v1/whatsapp/messages/bulk/send
Bulk Template Message with Media Header
Send bulk WhatsApp template messages with media header (image/video/document).

Request Structure

What you need to send
templateId

Template Id

string
This value is used to define the template id when sending the message.
1610629016778422
templateName

Template Name

string
This value is used to define the template name when sending the message.
invoice_template
dynamicHeader

Dynamic Header

object
This value is used to define the dynamic header when sending the message.
{ "type": "image", "mediaId": "MEDIA_ID_FROM_META", "filename": "promo_banner.jpg", "mediaSize": 204800 }
recipients

Recipients

array
This value is used to define the recipients when sending the message.
[ { "phone": "+919999999999", "templateParams": [ "INV-7890" ] } ]
JSON to send

{
  "templateId": "1610629016778422",
  "templateName": "invoice_template",
  "dynamicHeader": {
    "type": "image",
    "mediaId": "MEDIA_ID_FROM_META",
    "filename": "promo_banner.jpg",
    "mediaSize": 204800
  },
  "recipients": [
    {
      "phone": "+919999999999",
      "templateParams": [
        "INV-7890"
      ]
    }
  ]
}
Success

 {
  "statusCode": 200,
  "message": "Bulk messages enqueued successfully (1 recipients)",
  "payload": {
    "campaignRefId": "cmp_abc123xyz",
    "enqueuedCount": 1
  }
}
Error

 {
  "status": false,
  "statusCode": 400,
  "message": "recipients is missing"
}

POST
/v1/whatsapp/messages/bulk/send
Bulk Message – Common Error
Common error response for bulk messaging.

Success

 {}
Error

 {
  "status": false,
  "statusCode": 400,
  "message": "recipients is missing"
}

Template APIs
Endpoints for fetching and managing WhatsApp message templates.

GET
/v1/whatsapp/templates/fetch?page=1&limit=20
Fetch Templates
Fetch approved WhatsApp message templates linked to the selected business and WhatsApp account. Supports pagination.

Success

 {
  "sucess": true,
  "statusCode": 200,
  "message": "Templates fetched successfully",
  "total": 37,
  "page": 1,
  "limit": 20,
  "data": [
    {
      "template_name": "order_update",
      "template_id": "1610629016778422",
      "language": "en_US",
      "category": "MARKETING",
      "template_body": "Hello {{1}}, your order {{2}} is confirmed.",
      "components": [
        {
          "type": "BODY",
          "text": "Hello {{1}}, your order {{2}} is confirmed."
        }
      ],
      "media_type": null,
      "media_gcp_url": null,
      "media_header_handle": null,
      "buttons": [
        {
          "type": "URL",
          "text": "View Order"
        }
      ],
      "meta_status": "APPROVED",
      "createdAt": "2025-01-10T08:15:30.000Z"
    }
  ]
}
Error

 {
  "status": false,
  "statusCode": 401,
  "message": "Unauthorized: business_ref_id / whatsapp_ref_id missing",
  "data": null
}

GET
/v1/whatsapp/templates/fetch?page=1&limit=20
Fetch Templates – Empty State
Returned when WhatsApp account exists but no templates are available.

Success

 {
  "sucess": true,
  "statusCode": 204,
  "message": "No templates found",
  "total": 0,
  "page": 1,
  "limit": 20,
  "data": []
}
Error

 {}

Media APIs
Endpoints for uploading media files (image, video, audio, document) to be used in WhatsApp messages and templates.

POST
/v1/whatsapp/media/upload
Upload Media
Upload media files (image, video, audio, document) to WhatsApp. The returned media_id can be used in template headers or media messages.

Request Structure

What you need to send
file

File

file
This value is used to define the file when sending the message.
Multipart file (image/video/audio/document)
JSON to send

{
  "file": "Multipart file (image/video/audio/document)"
}
Success

 {
  "status": true,
  "statusCode": 200,
  "message": "Media uploaded successfully",
  "data": {
    "media_id": "174509235678912"
  }
}
Error

 {
  "status": false,
  "statusCode": 401,
  "message": "Unauthorized: Invalid or missing API key"
}

Webhooks
Webhooks allow CampaignBot to send real-time events to your server, such as incoming messages and message delivery updates.

POST
Your webhook endpoint URL
Webhook Overview & Security
All webhook requests from CampaignBot are cryptographically signed. This helps you verify that the request is really sent by CampaignBot and that the data is not modified.

Request Structure

What you need to send
algorithm

Algorithm

string
This value is used to define the algorithm when sending the message.
HMAC with SHA-256
secret

Secret

string
This value is used to define the secret when sending the message.
Your client webhook secret key
signedData

Signed Data

string
This value is used to define the signed data when sending the message.
Raw JSON request body
headerUsed

Header Used

string
This value is used to define the header used when sending the message.
X-Webhook-Signature
encoding

Encoding

string
This value is used to define the encoding when sending the message.
Hexadecimal
prefix

Prefix

string
This value is used to define the prefix when sending the message.
sha256=
signatureExample

Signature Example

string
This value is used to define the signature example when sending the message.
sha256=8e4c3c9e9c4a0d8e9f72c1e0c94a4c8f7a3b8f...
JSON to send

{
  "algorithm": "HMAC with SHA-256",
  "secret": "Your client webhook secret key",
  "signedData": "Raw JSON request body",
  "headerUsed": "X-Webhook-Signature",
  "encoding": "Hexadecimal",
  "prefix": "sha256=",
  "signatureExample": "sha256=8e4c3c9e9c4a0d8e9f72c1e0c94a4c8f7a3b8f..."
}
Success

 {
  "statusCode": 200,
  "message": "Webhook received and verified successfully"
}
Error

 {
  "statusCode": 401,
  "message": "Invalid or missing webhook signature"
}

POST
Your webhook endpoint URL
Incoming Message Webhook
Triggered when an end user sends a message to the WhatsApp Business number connected to your account.

Request Structure

What you need to send
event

Event

string
This value is used to define the event when sending the message.
incoming_message
meta_raw

Meta_raw

object
This value is used to define the meta_raw when sending the message.
{}
meta_contacts

Meta_contacts

array
This value is used to define the meta_contacts when sending the message.
[]
meta_metadata

Meta_metadata

object
This value is used to define the meta_metadata when sending the message.
{}
processed

Processed

object
This value is used to define the processed when sending the message.
{ "message_id": "wamid.HBgMNTkx...", "from": "+919876543210", "type": "text", "text": "Hello", "timestamp": "2026-01-03T10:15:30.000Z", "media": { "id": null, "url": null } }
system

System

object
This value is used to define the system when sending the message.
{ "received_at": "2026-01-03T10:15:31.123Z" }
JSON to send

{
  "event": "incoming_message",
  "meta_raw": {},
  "meta_contacts": [],
  "meta_metadata": {},
  "processed": {
    "message_id": "wamid.HBgMNTkx...",
    "from": "+919876543210",
    "type": "text",
    "text": "Hello",
    "timestamp": "2026-01-03T10:15:30.000Z",
    "media": {
      "id": null,
      "url": null
    }
  },
  "system": {
    "received_at": "2026-01-03T10:15:31.123Z"
  }
}
Success

 {
  "statusCode": 200,
  "message": "Incoming message received successfully"
}
Error

 {
  "statusCode": 400,
  "message": "Invalid incoming message payload"
}
POST
Your webhook endpoint URL
Message Status Webhook
Triggered when WhatsApp updates the delivery state of an outbound message. This includes sent, delivered, read, and failed statuses.

Request Structure

What you need to send
event

Event

string
This value is used to define the event when sending the message.
message_status
meta_metadata

Meta_metadata

object
This value is used to define the meta_metadata when sending the message.
{ "phone_number_id": "1234567890" }
data

Data

object
This value is used to define the data when sending the message.
{ "message_id": "wamid.HBgMNTkx...", "status": "delivered", "timestamp": "2026-01-03T10:16:05.000Z", "recipient": "+919876543210", "conversation": { "id": "conv_abc123", "origin": { "type": "user_initiated" } }, "pricing": { "billable": true, "category": "marketing" } }
system

System

object
This value is used to define the system when sending the message.
{ "received_at": "2026-01-03T10:16:06.512Z" }
JSON to send

{
  "event": "message_status",
  "meta_metadata": {
    "phone_number_id": "1234567890"
  },
  "data": {
    "message_id": "wamid.HBgMNTkx...",
    "status": "delivered",
    "timestamp": "2026-01-03T10:16:05.000Z",
    "recipient": "+919876543210",
    "conversation": {
      "id": "conv_abc123",
      "origin": {
        "type": "user_initiated"
      }
    },
    "pricing": {
      "billable": true,
      "category": "marketing"
    }
  },
  "system": {
    "received_at": "2026-01-03T10:16:06.512Z"
  }
}
Success

 {
  "statusCode": 200,
  "message": "Message status received successfully"
}
Error

 {
  "statusCode": 400,
  "message": "Invalid message status payload"
}
POST
Your webhook endpoint URL
Message Status Webhook (Failed)
Triggered when a message fails to send. Includes detailed failure reason from WhatsApp.

Request Structure

What you need to send
event

Event

string
This value is used to define the event when sending the message.
message_status
data

Data

object
This value is used to define the data when sending the message.
{ "message_id": "wamid.HBgMNTkx...", "status": "failed", "timestamp": "2026-01-03T10:16:10.000Z", "recipient": "+919876543210", "failure": { "title": "Invalid recipient", "message": "Recipient phone number does not exist", "raw": { "errors": [ { "code": 131047, "title": "Invalid recipient", "message": "Recipient phone number does not exist" } ] } } }
system

System

object
This value is used to define the system when sending the message.
{ "received_at": "2026-01-03T10:16:11.002Z" }
JSON to send

{
  "event": "message_status",
  "data": {
    "message_id": "wamid.HBgMNTkx...",
    "status": "failed",
    "timestamp": "2026-01-03T10:16:10.000Z",
    "recipient": "+919876543210",
    "failure": {
      "title": "Invalid recipient",
      "message": "Recipient phone number does not exist",
      "raw": {
        "errors": [
          {
            "code": 131047,
            "title": "Invalid recipient",
            "message": "Recipient phone number does not exist"
          }
        ]
      }
    }
  },
  "system": {
    "received_at": "2026-01-03T10:16:11.002Z"
  }
}
Success

 {
  "statusCode": 200,
  "message": "Failure status received successfully"
}
Error

 {
  "statusCode": 400,
  "message": "Invalid failure payload"
}