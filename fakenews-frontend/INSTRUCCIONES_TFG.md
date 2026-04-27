# Contexto del Proyecto: FakeNews Insight (Frontend)

## 1. Descripción del Proyecto
FakeNews Insight es una plataforma SaaS orientada a la detección de noticias falsas mediante Inteligencia Artificial. Este repositorio contiene exclusivamente el Frontend del proyecto (Web App y futuro Dashboard Admin).

## 2. Stack Tecnológico
- **Framework:** React 18 (Inicializado con Vite)
- **Estilos:** Tailwind CSS
- **Componentes UI:** shadcn/ui (basado en Radix UI) + Lucide React (iconos)
- **Enrutamiento:** React Router DOM v6
- **Estado Global:** Zustand
- **Backend/Auth (BaaS):** Supabase (SDK `@supabase/supabase-js`)
- **API Externa:** FastAPI (Python) - *Se conectará más adelante*

## 3. Arquitectura Estricta: Patrón MVC adaptado a React
El tutor del TFG exige una separación estricta de responsabilidades (Separation of Concerns). El flujo de datos DEBE ser siempre unidireccional:
**UI (Componentes/Páginas) -> Estado Centralizado (Zustand) -> Services (API/Supabase) -> Base de Datos.**

### Reglas de Arquitectura:
1. **Capa UI (Vistas/Controladores de Vista):** - Ubicación: `src/components/` y `src/pages/`.
   - Responsabilidad: Renderizar la interfaz, manejar eventos (clicks, inputs) y leer el estado de Zustand.
   - **PROHIBIDO:** Hacer `fetch`, llamadas directas a Supabase o contener lógica de negocio compleja.

2. **Capa de Estado (El "Controlador/Modelo"):**
   - Ubicación: `src/store/` (usando Zustand).
   - Responsabilidad: Almacenar la sesión del usuario, datos de la UI y hacer de puente. Los componentes UI llaman a las acciones de Zustand (ej: `login()`), y Zustand llama a los Services.

3. **Capa de Servicios (El "Modelo/API"):**
   - Ubicación: `src/services/`.
   - Responsabilidad: Único lugar donde se permite importar `@supabase/supabase-js` o hacer peticiones `fetch` (Axios) a FastAPI.
   - Todo servicio debe devolver los datos procesados o lanzar/retornar errores limpios.

## 4. Estructura de Carpetas Requerida
```text
src/
├── assets/          # Imágenes y recursos estáticos
├── components/      # Componentes reutilizables
│   ├── ui/          # Componentes generados automáticamente por shadcn/ui
│   └── layout/      # Navbar, Sidebar, Footer
├── pages/           # Vistas completas (ej: Login.jsx, Dashboard.jsx)
├── services/        # Lógica de conexión externa
│   ├── supabase.js  # Configuración e instancia del cliente de Supabase
│   └── auth.js      # Funciones: signIn, signUp, signOut
├── store/           # Gestores de estado de Zustand
│   └── authStore.js # Estado de la sesión del usuario
├── lib/             # Utilidades genéricas (ej: utils.js de shadcn)
├── App.jsx          # Configuración de React Router
└── main.jsx         # Punto de entrada de React