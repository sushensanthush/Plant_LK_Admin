# Plant.LK Admin Panel & Management System

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white" alt="HTML5"/>
  <img src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white" alt="CSS3"/>
  <img src="https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript ES Modules"/>
  <img src="https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black" alt="Firebase"/>
  <img src="https://img.shields.io/badge/Cloud%20Firestore-FFA000?logo=firebase&logoColor=white" alt="Cloud Firestore"/>
  <img src="https://img.shields.io/badge/Firebase%20Authentication-DD2C00?logo=firebase&logoColor=white" alt="Firebase Authentication"/>
  <img src="https://img.shields.io/badge/Firebase%20Storage-039BE5?logo=firebase&logoColor=white" alt="Firebase Storage"/>
  <img src="https://img.shields.io/badge/Bootstrap%20Icons-7952B3?logo=bootstrap&logoColor=white" alt="Bootstrap Icons"/>
  <img src="https://img.shields.io/badge/Google%20Fonts-Syne%20%26%20DM%20Sans-4285F4" alt="Google Fonts"/>
</p>

<p align="center">
  A web-based M-Commerce administration dashboard for managing plant nurseries, products, orders, customers, and store locations across Sri Lanka.
</p>

---

## Overview

**Plant.LK Admin** is a web-based administration panel designed to manage the core operations of the Plant.LK M-Commerce ecosystem. It provides a centralized interface for managing plant catalogues, product categories, physical nursery locations, customer orders, customer inquiries, and registered user accounts.

The dashboard integrates with Firebase services to support data management and synchronization with the Plant.LK Android application, where shared collections and configurations are used.

## Key Features

- **Dashboard & Analytics (`Overview`)** — Displays summary metrics for products, categories, nurseries, incoming orders, and registered users, with quick-access navigation.
- **Product Catalog Management (`Products`)** — Add, update, and remove plants with prices in Sri Lankan rupees (LKR), stock information, ratings, and attributes such as size, colour, and pot options.
- **Category Organization (`Categories`)** — Manage plant categories, sorting order, category images, and automatically generated slugs.
- **Nursery Location Mapping (`Nurseries`)** — Manage nursery outlets across Sri Lanka, including GPS coordinates (latitude and longitude), opening hours, and contact details.
- **Order Tracking & Status Control (`Orders`)** — Monitor customer purchases and manage order fulfilment statuses: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, and `CANCELLED`.
- **Customer Inquiry Center (`Messages`)** — Review customer contact-form submissions and access quick email-response links.
- **User Accounts & Roles (`Users`)** — Manage registered accounts, assign supported roles (`User`, `Moderator`, and `Admin`), and update account statuses.
- **Theme Customization** — Switch between dark and light themes through a modern, responsive interface.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Dashboard page structure |
| CSS3 | Styling, layouts, and theme customization |
| JavaScript ES Modules | Application logic, event handling, and UI state |
| Bootstrap Icons | Interface icons |
| Google Fonts | Syne and DM Sans typography |
| Firebase Authentication | User authentication |
| Cloud Firestore | Application data storage and synchronization |
| Firebase Storage | Image hosting and storage |

---

## Project Structure

```text
Plant.LK-Admin/
├── css/
│   └── dashboard.css       # Dashboard styling and theme variables
├── js/
│   └── dashboard.js        # Firebase integration, UI state, and interactions
├── images/
│   └── favicon-white.png   # Brand favicon
├── index.html              # Main admin dashboard
├── login.html              # Admin authentication page
└── README.md               # Project documentation
```

---

## Getting Started

### Prerequisites

- A modern web browser.
- Visual Studio Code or another suitable code editor.
- Git, if cloning the repository.
- A configured Firebase project with the required services enabled.

### 1. Clone the Repository

Replace the placeholders with your actual repository URL and project directory.

```bash
git clone <YOUR_ADMIN_DASHBOARD_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
```

### 2. Configure Firebase

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select the Firebase project used by the dashboard.
3. Register or select the relevant Firebase web application.
4. Configure Firebase initialization according to the existing JavaScript module structure.
5. Enable the Firebase services required by the application.
6. Verify the Firestore collections, document fields, and Storage paths expected by the dashboard.

Use the configuration format supported by the existing source code. Preserve the current project settings unless a change is necessary.

### 3. Run the Application

1. Open the project directory in Visual Studio Code.
2. Start a local development server, such as the Live Server extension.
3. Open the local URL provided by the server.
4. Navigate to the login page and sign in with an authorized administrator account.

A local development server is recommended because the application uses JavaScript ES modules and Firebase integration.

### 4. Configure Administrator Access

Ensure that the Firebase Authentication account and authorization configuration match the dashboard implementation. Configure Firestore and Storage security rules to restrict administrative operations to appropriately authorized users.

---

## Security Considerations

- Enforce authorization through Firebase Security Rules and the application's supported role-management mechanism.
- Do not rely solely on hiding dashboard buttons or pages to protect administrative operations.
- Never commit private keys, passwords, or other sensitive credentials to the repository.
- Validate user-provided data before processing or storing it.
- Restrict access to customer information and administrative functions.
- Test authentication, authorization, and database rules before production deployment.

---

## Related Project

**Plant.LK Android Application**

The companion Android M-Commerce application enables customers to explore plants, manage shopping activities, and discover nursery locations. The Android application and admin dashboard can share relevant data through Firebase, depending on their collection structures and configurations.

---

## Future Enhancements

- Advanced sales and order analytics.
- Improved inventory and stock reports.
- More granular role-based permissions.
- Enhanced customer inquiry management.
- Administrative audit logs.
- Advanced product search and filtering.
- Exportable reports and management summaries.

---

## Author

**Sushen Santhush**

- GitHub: [@sushensanthush](https://github.com/sushensanthush)
- LinkedIn: [sushensanthush](https://www.linkedin.com/in/sushensanthush/)

---

## License

Plant.LK Admin is released under the **Plant.LK Educational Use License** (see `LICENSE`). The source code is available for educational and personal non-commercial use, but it is not open-source software.

| Allowed | Not allowed without written permission |
|---|---|
| Viewing, downloading, and running the software for learning, teaching, coursework, research, and personal non-commercial experimentation | Commercial use of any kind, including commercial products, services, hosting, and selling |
| Making private modifications for permitted purposes | Distributing or publishing the software or modified versions; forking on GitHub is permitted |
| Referencing the project in educational materials, assignments, or reports with appropriate credit | Submitting the project or presenting it as your own work |
| Studying the source code to understand its design and implementation | Removing copyright notices or misrepresenting the original authorship |

**Attribution:** Any permitted reference to this project must acknowledge Plant.LK and its original author.

For permissions beyond those listed above, obtain written authorization from the copyright holder.


---

<p align="center">
  <strong>Plant.LK — We grow the plants. You grow the life.</strong>
</p>
