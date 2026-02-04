# ElectPro PRD - Additional Module Specifications (Part 4)
## Based on Screenshots 052-061

This document supplements the main PRD with detailed specifications for:
- Add Section Page (Bulk Upload)
- Sub-Caste Module (Enhanced with Data)
- Part List (Enhanced Table Columns)
- Create Part Manual Form

---

## 1. Add Section Page

### 1.1 Overview

**URL:** `/add-section`

**Purpose:** Add new sections via bulk upload or manual entry.

### 1.2 UI Components (from screenshots 052-054)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Add Section                             │
│                                                                 │
│              Choose a method to add section                     │
│                                                                 │
│        ● Bulk Upload        ○ Manual                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    Section Bulk Upload                          │
│                                                                 │
│          Upload a CSV file with section details here.           │
│                                                                 │
│    ┌─────────────────────────────────────────────────────┐      │
│    │                                                     │      │
│    │                    📁                               │      │
│    │                                                     │      │
│    │        Drag your CSV file to start uploading        │      │
│    │                                                     │      │
│    │                       or                            │      │
│    │                                                     │      │
│    │               [ Browse files ]                      │      │
│    │                                                     │      │
│    └─────────────────────────────────────────────────────┘      │
│                                                                 │
│    Download Sample File                                         │
│    Download Excel Template                                      │
│                                                                 │
│    [ Upload ]                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Page Structure

| Element | Description |
|---------|-------------|
| Title | "Add Section" |
| Subtitle | "Choose a method to add section" |
| Method Toggle | Radio buttons: ● Bulk Upload ○ Manual |
| Section Title | "Section Bulk Upload" |
| Description | "Upload a CSV file with section details here." |
| Drop Zone | Drag & drop area with folder icon |
| Browse Button | "Browse files" button |
| Sample Download | "Download Sample File" heading |
| Template Link | "Download Excel Template" link |
| Submit Button | "Upload" button (at bottom) |

### 1.4 CSV Template Fields

```csv
part_number,section_number,section_name,section_name_local
6,1,"Ward 1 - Area Name","வார்டு 1 - பகுதி பெயர்"
6,2,"Ward 2 - Area Name","வார்டு 2 - பகுதி பெயர்"
7,1,"Ward 1 - Different Area","வார்டு 1 - வேறு பகுதி"
8,999,"Overseas Voters","வெளிநாட்டு வாக்காளர்"
```

### 1.5 API Endpoints

```
POST /api/sections/bulk-upload
Content-Type: multipart/form-data
Body: {
  file: <CSV/Excel file>,
  election_id: "uuid"
}

Response:
{
  "success": true,
  "data": {
    "total": 1792,
    "created": 1780,
    "updated": 10,
    "failed": 2,
    "errors": [
      { "row": 15, "field": "section_number", "message": "Duplicate section" }
    ]
  }
}

GET /api/sections/template
Response: Excel file download
```

---

## 2. Sub-Caste Module (Enhanced)

### 2.1 Overview

**URL:** `/sub-caste`

**Purpose:** Manage sub-castes with relationships to parent castes and religions.

### 2.2 UI Components (from screenshots 055-057)

```
┌─────────────────────────────────────────────────────────────────┐
│                          Sub-Caste                              │
├─────────────────────────────────────────────────────────────────┤
│ [Search Sub-Caste___] [🔍] [Clear]  [📥 Import] [+ Add Sub-Caste]│
│                                                    [Actions ▼]  │
├─────────────────────────────────────────────────────────────────┤
│ ☐ │ Sub-Caste Name ↕          │ Religion      │ Caste    │ ⋯   │
├───┼───────────────────────────┼───────────────┼──────────┼──────┤
│ ☐ │ Kallar (கள்ளர்)           │ இந்து (Hindu) │ Mukkulathor │ ⋯ │
│ ☐ │ Devendrakulathar          │ இந்து (Hindu) │ Devendra Kula │ ⋯│
│ ☐ │ Vanniyar (வன்னியர்)       │ இந்து (Hindu) │ Vanniyar │ ⋯   │
│ ☐ │ Maravar (மறவர்)           │ இந்து (Hindu) │ Mukkulathor │ ⋯ │
│ ☐ │ Kadaiyar (கடையர்)         │ இந்து (Hindu) │ Devendra Kula │ ⋯│
│ ☐ │ Vanniya Gounder           │ இந்து (Hindu) │ Vanniyar │ ⋯   │
│ ☐ │ Kaalaadi (காலாடி)         │ இந்து (Hindu) │ Devendra Kula │ ⋯│
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Table Columns

| Column | Type | Description |
|--------|------|-------------|
| Checkbox | Selection | For bulk actions |
| Sub-Caste Name | Text | Bilingual: English (Tamil) |
| Religion | Text | Parent religion with local script |
| Caste | Text | Parent caste name |
| Actions | Menu | Edit, Delete (⋯ three-dot menu) |

### 2.4 Complete Sub-Caste Data

| # | Sub-Caste Name | Tamil | Religion | Parent Caste |
|---|----------------|-------|----------|--------------|
| 1 | Kallar | கள்ளர் | Hindu (இந்து) | Mukkulathor (முக்குலத்தோர்) |
| 2 | Devendrakulathar | தேவேந்திரகுலத்தர் | Hindu (இந்து) | Devendra Kula Velaalar (தேவேந்திர குல வேளாளர்) |
| 3 | Vanniyar | வன்னியர் | Hindu (இந்து) | Vanniyar (வன்னியர்) |
| 4 | Maravar | மறவர் | Hindu (இந்து) | Mukkulathor (முக்குலத்தோர்) |
| 5 | Kadaiyar | கடையர் | Hindu (இந்து) | Devendra Kula Velaalar (தேவேந்திர குல வேளாளர்) |
| 6 | Vanniya Gounder | வன்னிய கவுண்டர் | Hindu (இந்து) | Vanniyar (வன்னியர்) |
| 7 | Kaalaadi | காலாடி | Hindu (இந்து) | Devendra Kula Velaalar (தேவேந்திர குல வேளாளர்) |

### 2.5 Sub-Caste to Caste Mapping

| Parent Caste | Sub-Castes |
|--------------|------------|
| **Mukkulathor** | Kallar, Maravar, Agamudaiyar |
| **Devendra Kula Velaalar** | Devendrakulathar, Kadaiyar, Kaalaadi, Kudumbar |
| **Vanniyar** | Vanniyar, Vanniya Gounder |

### 2.6 Features

| Feature | Description |
|---------|-------------|
| Search | Search by sub-caste name |
| Import Sub-Castes | Bulk import via CSV |
| Add Sub-Caste | Add single sub-caste |
| Actions Menu | Bulk operations (delete selected, export) |
| Loading State | Shows spinner during data fetch |
| Empty State | "No data" message with icon |

### 2.7 API Endpoints

```
GET /api/sub-castes?election_id=xxx&search=&caste_id=

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "subCasteName": "Kallar",
      "subCasteNameLocal": "கள்ளர்",
      "religionId": "uuid",
      "religionName": "Hindu",
      "religionNameLocal": "இந்து",
      "casteId": "uuid",
      "casteName": "Mukkulathor",
      "casteNameLocal": "முக்குலத்தோர்",
      "voterCount": 5000,
      "isActive": true
    }
  ]
}

POST /api/sub-castes
Body: {
  "subCasteName": "Kallar",
  "subCasteNameLocal": "கள்ளர்",
  "casteId": "uuid",
  "religionId": "uuid"
}

POST /api/sub-castes/import
Content-Type: multipart/form-data
```

### 2.8 Import Modal (from screenshot 057)

The import modal shows a preview of the CSV template with columns:
- Import Sub-Castes
- Sub-Caste Name
- Original Religion
- Original Caste
- Sample Religion
- Sample Caste
- (Additional mapping columns)

---

## 3. Part List (Enhanced)

### 3.1 Overview

**URL:** `/part-list`

**Purpose:** View and manage all polling booth parts with detailed information.

### 3.2 Enhanced UI Components (from screenshot 059)

```
┌─────────────────────────────────────────────────────────────────┐
│                          Part List                              │
├─────────────────────────────────────────────────────────────────┤
│        Search by part number, name, or pincode                  │
│ [Search parts..._______________] [🔍] [📁]     [Actions ▼]      │
├─────────────────────────────────────────────────────────────────┤
│ ☐ │Image│Part│Part Name    │Part Name │Part     │School│School │Actions│
│   │     │ No │English      │L1        │Location │Name  │Location│      │
├───┼─────┼────┼─────────────┼──────────┼─────────┼──────┼────────┼──────┤
│ ☐ │ 👤  │ 1  │GOVT.HIGH    │அரசு உயர்│10.0756, │      │ 0, 0   │👁️✏️🔗🗑️│
│   │     │    │SCHOOL,      │நிலைப்   │78.7519  │      │        │      │
│   │     │    │KOVILUR,     │பள்ளி    │         │      │        │      │
│   │     │    │WEST WING    │கோவிலூர், │         │      │        │      │
│   │     │    │             │மேற்கு   │         │      │        │      │
│   │     │    │             │பகுதி    │         │      │        │      │
├───┼─────┼────┼─────────────┼──────────┼─────────┼──────┼────────┼──────┤
│ ☐ │ 👤  │ 2  │GOVT.HIGH    │அரசு உயர்│10.0785, │      │        │👁️✏️🔗🗑️│
│   │     │    │SCHOOL       │நிலைப்   │78.7396  │      │        │      │
│   │     │    │KOVILUR,     │பள்ளி    │         │      │        │      │
│   │     │    │NORTH        │கோவிலூர், │         │      │        │      │
│   │     │    │BUILDING     │வடக்கு   │         │      │        │      │
│   │     │    │             │கட்டிடம் │         │      │        │      │
├───┼─────┼────┼─────────────┼──────────┼─────────┼──────┼────────┼──────┤
│ ☐ │ 👤  │ 3  │PANCHAYAT    │ஊராட்சி  │         │      │        │👁️✏️🔗🗑️│
│   │     │    │UNION MIDDLE │ஒன்றிய   │         │      │        │      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Table Columns (Enhanced)

| Column | Field | Description |
|--------|-------|-------------|
| Checkbox | - | Bulk selection |
| Image | image_url | Part/Booth photo (avatar placeholder) |
| Part No | part_number | Part number (1, 2, 3...) |
| Part Name English | part_name | English booth name |
| Part Name L1 | part_name_local | Tamil/Local language name |
| Part Location | lat, lng | GPS coordinates (e.g., "10.0756, 78.7519") |
| School Name | school_name | Polling center school name |
| School Location | school_lat, school_lng | School GPS coordinates |
| Actions | - | View 👁️, Edit ✏️, External Link 🔗, Delete 🗑️ |

### 3.4 Sample Part Data

| Part No | Part Name English | Part Name L1 (Tamil) | Location |
|---------|-------------------|----------------------|----------|
| 1 | GOVT.HIGH SCHOOL, KOVILUR, WEST WING | அரசு உயர்நிலைப்பள்ளி கோவிலூர், மேற்கு பகுதி | 10.0756, 78.7519 |
| 2 | GOVT.HIGH SCHOOL KOVILUR, NORTH BUILDING | அரசு உயர்நிலைப்பள்ளி கோவிலூர், வடக்கு கட்டிடம் | 10.0785, 78.7396 |
| 3 | PANCHAYAT UNION MIDDLE | ஊராட்சி ஒன்றிய நடுநிலைப்பள்ளி | - |

### 3.5 Search Features

**Search Label:** "Search by part number, name, or pincode"

**Search Capabilities:**
- By part number (e.g., "1", "25", "388")
- By part name in English (e.g., "GOVT.HIGH SCHOOL")
- By part name in Tamil (e.g., "அரசு உயர்நிலை")
- By pincode (e.g., "630001")

### 3.6 Action Buttons

| Icon | Action | Description |
|------|--------|-------------|
| 👁️ | View | Open part detail view |
| ✏️ | Edit | Edit part information |
| 🔗 | External | Open location in Google Maps |
| 🗑️ | Delete | Delete part (with confirmation) |

### 3.7 API Endpoints

```
GET /api/parts?election_id=xxx&search=&page=1&limit=10

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "partNumber": 1,
      "partName": "GOVT.HIGH SCHOOL, KOVILUR, WEST WING",
      "partNameLocal": "அரசு உயர்நிலைப்பள்ளி கோவிலூர், மேற்கு பகுதி",
      "partLocation": {
        "lat": 10.0756,
        "lng": 78.7519
      },
      "schoolName": null,
      "schoolLocation": {
        "lat": 0,
        "lng": 0
      },
      "imageUrl": null,
      "totalVoters": 1500,
      "totalSections": 5
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 388
  }
}
```

---

## 4. Create Part - Manual Form

### 4.1 Overview

**URL:** `/add-part` (Manual mode)

**Purpose:** Manually add a new part/booth with detailed information.

### 4.2 Manual Form UI (from screenshots 060-061)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Create Part                             │
│                                                                 │
│              Choose a method to add part                        │
│                                                                 │
│        ○ Bulk Upload        ● Manual                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    Add Part Image                                               │
│    ┌─────────────────┐                                          │
│    │                 │                                          │
│    │    📤 Upload    │                                          │
│    │     Photo       │                                          │
│    │                 │                                          │
│    └─────────────────┘                                          │
│    Image size should not exceed 1 MB                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    * Part No                      * Part Name English           │
│    ┌─────────────────────┐        ┌─────────────────────────┐   │
│    │ Enter part number   │        │ Enter part name in Eng  │   │
│    └─────────────────────┘        └─────────────────────────┘   │
│                                                                 │
│    Part Name L1                   Part Type                     │
│    ┌─────────────────────┐        ○ Urban    ○ Rural            │
│    │ Enter part name in  │                                      │
│    │ local language      │                                      │
│    └─────────────────────┘                                      │
│                                                                 │
│    Part Location (Lat, Long)                                    │
│    ┌─────────────────────┐        ┌─────────────────────────┐   │
│    │ Latitude            │        │ Longitude               │   │
│    └─────────────────────┘        └─────────────────────────┘   │
│                                                                 │
│    [Continue to add more fields...]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| Part Image | File Upload | No | Max 1MB, JPG/PNG | Booth/building photo |
| Part No | Number | **Yes*** | Unique, positive integer | Part number |
| Part Name English | Text | **Yes*** | Min 3 chars | Booth name in English |
| Part Name L1 | Text | No | - | Booth name in Tamil/local language |
| Part Type | Radio | No | Urban/Rural | Classification of area |
| Part Location (Lat) | Decimal | No | Valid latitude (-90 to 90) | GPS latitude |
| Part Location (Long) | Decimal | No | Valid longitude (-180 to 180) | GPS longitude |

### 4.4 Additional Form Fields (Expected)

Based on the Part List table, additional fields likely include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| School Name | Text | No | Polling center school name |
| School Location (Lat) | Decimal | No | School GPS latitude |
| School Location (Long) | Decimal | No | School GPS longitude |
| Address | Textarea | No | Full address |
| Landmark | Text | No | Nearby landmark |
| Pincode | Text | No | Postal code |
| Building Type | Select | No | school, panchayat, community_hall |

### 4.5 Image Upload Component

```
┌─────────────────────┐
│                     │
│     📤 Upload       │
│       Photo         │
│                     │
└─────────────────────┘
Image size should not exceed 1 MB
```

**Specifications:**
- Max file size: 1 MB
- Accepted formats: JPG, JPEG, PNG
- Preview: Shows thumbnail after upload
- Dimensions: Recommended 800x600px

### 4.6 Part Type Options

| Option | Value | Description |
|--------|-------|-------------|
| Urban | `urban` | City/town areas |
| Rural | `rural` | Village/rural areas |

### 4.7 API Endpoint (Create)

```
POST /api/parts
Content-Type: multipart/form-data

Body:
{
  "partNumber": 389,
  "partName": "NEW SCHOOL NAME",
  "partNameLocal": "புதிய பள்ளி பெயர்",
  "partType": "rural",
  "latitude": 10.0756,
  "longitude": 78.7519,
  "schoolName": "School Name",
  "schoolLatitude": 10.0756,
  "schoolLongitude": 78.7519,
  "address": "Full address here",
  "landmark": "Near Temple",
  "pincode": "630001",
  "buildingType": "school",
  "image": <File>
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "partNumber": 389,
    "partName": "NEW SCHOOL NAME",
    "partNameLocal": "புதிய பள்ளி பெயர்",
    "imageUrl": "https://storage.example.com/parts/389.jpg",
    "createdAt": "2026-01-17T10:06:00Z"
  }
}
```

---

## 5. Database Schema Updates

### 5.1 Parts Table (Enhanced)

```sql
CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
    
    -- Part identification
    part_number INTEGER NOT NULL,
    
    -- Part details (bilingual)
    part_name VARCHAR(500) NOT NULL,
    part_name_local VARCHAR(500),
    
    -- Part classification
    part_type VARCHAR(10) CHECK (part_type IN ('urban', 'rural')),
    
    -- Part location
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    address TEXT,
    landmark VARCHAR(255),
    pincode VARCHAR(10),
    
    -- School/Polling center details
    school_name VARCHAR(255),
    school_latitude DECIMAL(10,8),
    school_longitude DECIMAL(11,8),
    building_type VARCHAR(50),  -- school, panchayat, community_hall
    
    -- Image
    image_url TEXT,
    
    -- Statistics (denormalized)
    total_voters INTEGER DEFAULT 0,
    total_sections INTEGER DEFAULT 0,
    male_voters INTEGER DEFAULT 0,
    female_voters INTEGER DEFAULT 0,
    other_voters INTEGER DEFAULT 0,
    
    -- Vulnerability
    is_vulnerable BOOLEAN DEFAULT FALSE,
    vulnerability_type VARCHAR(20),
    vulnerability_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(election_id, part_number)
);

-- Indexes
CREATE INDEX idx_parts_election ON parts(election_id);
CREATE INDEX idx_parts_number ON parts(part_number);
CREATE INDEX idx_parts_pincode ON parts(pincode);
CREATE INDEX idx_parts_type ON parts(part_type);

-- Full-text search index
CREATE INDEX idx_parts_search ON parts USING GIN (
    to_tsvector('english', part_name || ' ' || COALESCE(part_name_local, ''))
);
```

### 5.2 Sub-Castes Table (Enhanced)

```sql
CREATE TABLE sub_castes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
    
    -- Sub-caste details
    sub_caste_name VARCHAR(100) NOT NULL,
    sub_caste_name_local VARCHAR(100),
    
    -- Parent relationships
    caste_id UUID REFERENCES castes(id) ON DELETE SET NULL,
    religion_id UUID REFERENCES religions(id) ON DELETE SET NULL,
    
    -- Statistics
    voter_count INTEGER DEFAULT 0,
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(election_id, sub_caste_name, caste_id)
);

-- Indexes
CREATE INDEX idx_sub_castes_election ON sub_castes(election_id);
CREATE INDEX idx_sub_castes_caste ON sub_castes(caste_id);
CREATE INDEX idx_sub_castes_religion ON sub_castes(religion_id);
```

---

## 6. React Components

### 6.1 Create Part Form Component

```tsx
// CreatePartForm.tsx
interface CreatePartFormProps {
  onSuccess: (part: Part) => void;
  onCancel: () => void;
}

const CreatePartForm: React.FC<CreatePartFormProps> = ({ onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const onFinish = async (values: CreatePartValues) => {
    setUploading(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      const response = await api.post('/parts', formData);
      onSuccess(response.data);
    } catch (error) {
      message.error('Failed to create part');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      {/* Image Upload */}
      <Form.Item label="Add Part Image">
        <Upload
          accept=".jpg,.jpeg,.png"
          maxCount={1}
          beforeUpload={(file) => {
            if (file.size > 1024 * 1024) {
              message.error('Image size should not exceed 1 MB');
              return false;
            }
            setImageFile(file);
            return false;
          }}
        >
          <div className="upload-box">
            <UploadOutlined />
            <div>Upload Photo</div>
          </div>
        </Upload>
        <div className="hint">Image size should not exceed 1 MB</div>
      </Form.Item>

      {/* Part Number & Name */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item 
            name="partNumber" 
            label="Part No" 
            rules={[{ required: true }]}
          >
            <Input placeholder="Enter part number" type="number" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item 
            name="partName" 
            label="Part Name English" 
            rules={[{ required: true }]}
          >
            <Input placeholder="Enter part name in English" />
          </Form.Item>
        </Col>
      </Row>

      {/* Local Name & Part Type */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="partNameLocal" label="Part Name L1">
            <Input placeholder="Enter part name in local language" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="partType" label="Part Type">
            <Radio.Group>
              <Radio value="urban">Urban</Radio>
              <Radio value="rural">Rural</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
      </Row>

      {/* Location */}
      <Form.Item label="Part Location (Lat, Long)">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="latitude" noStyle>
              <Input placeholder="Latitude" type="number" step="0.0001" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="longitude" noStyle>
              <Input placeholder="Longitude" type="number" step="0.0001" />
            </Form.Item>
          </Col>
        </Row>
      </Form.Item>

      {/* Submit */}
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={uploading}>
            Create Part
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};
```

### 6.2 Sub-Caste Table Component

```tsx
// SubCasteTable.tsx
const SubCasteTable: React.FC = () => {
  const columns = [
    {
      title: 'Sub-Caste Name',
      dataIndex: 'subCasteName',
      sorter: true,
      render: (text: string, record: SubCaste) => (
        <span>
          {text} {record.subCasteNameLocal && `(${record.subCasteNameLocal})`}
        </span>
      )
    },
    {
      title: 'Religion',
      dataIndex: 'religionName',
      render: (text: string, record: SubCaste) => (
        <span>
          {record.religionNameLocal} ({text})
        </span>
      )
    },
    {
      title: 'Caste',
      dataIndex: 'casteName',
      render: (text: string, record: SubCaste) => (
        <span>
          {text} {record.casteNameLocal && `(${record.casteNameLocal})`}
        </span>
      )
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Dropdown menu={{ items: actionMenuItems(record) }}>
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={subCastes}
      loading={loading}
      locale={{ emptyText: <Empty description="No data" /> }}
      pagination={{
        showSizeChanger: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
      }}
    />
  );
};
```

---

## 7. Sidebar Navigation (Complete from Screenshots)

### 7.1 Election Manager Submenu

```
Election Manager ▼
├── Your Elections
├── App Banner
├── Voting History
├── Voter Category
├── Voter Slip
├── Party
├── Religion
├── Caste Category
├── Caste
├── Sub-Caste        ← Enhanced with data
├── Language
├── Schemes
└── Feedback
```

### 7.2 Part Manager Submenu

```
Part Manager ▼
├── Part List        ← Enhanced table columns
├── Add Part         ← Bulk Upload + Manual form
├── Section List
├── Add Section      ← Bulk Upload + Manual form
├── Part Map
├── Vulnerability
├── Booth Committee
└── BLA-2
```

---

## 8. URL Route Map (Updated)

```typescript
// Part Manager Routes
{ path: '/part-list', component: PartListPage },
{ path: '/add-part', component: AddPartPage },        // Bulk + Manual
{ path: '/section-list', component: SectionListPage },
{ path: '/add-section', component: AddSectionPage },  // Bulk + Manual
{ path: '/part-map', component: PartMapPage },
{ path: '/boothType', component: VulnerabilityPage },
{ path: '/booth-committee', component: BoothCommitteePage },
{ path: '/bla-2', component: BLA2Page },

// Election Manager Routes
{ path: '/sub-caste', component: SubCastePage },      // Enhanced
{ path: '/benefit-scheme', component: SchemesPage },
```

---

## 9. Validation Rules

### 9.1 Part Form Validation

```typescript
const partValidationRules = {
  partNumber: [
    { required: true, message: 'Part number is required' },
    { type: 'number', min: 1, message: 'Must be positive number' },
    { validator: async (_, value) => {
        const exists = await checkPartExists(value);
        if (exists) throw new Error('Part number already exists');
      }
    }
  ],
  partName: [
    { required: true, message: 'Part name is required' },
    { min: 3, message: 'Minimum 3 characters' },
    { max: 500, message: 'Maximum 500 characters' }
  ],
  latitude: [
    { type: 'number', min: -90, max: 90, message: 'Invalid latitude' }
  ],
  longitude: [
    { type: 'number', min: -180, max: 180, message: 'Invalid longitude' }
  ],
  image: [
    { validator: (_, file) => {
        if (file && file.size > 1024 * 1024) {
          return Promise.reject('Image size should not exceed 1 MB');
        }
        return Promise.resolve();
      }
    }
  ]
};
```

---

*Document Version: 4.0 | Add Section, Sub-Caste, Part List, Create Part Manual | January 2026*
