#!/usr/bin/env// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__dirname);

console.log('🚀 Iniciando script de subida...');
console.log('📁 Directorio actual:', __dirname); de

/**
 * Script simple para verificar la conexión con Firebase y subir preguntas
 * Este script usa la configuración web de Firebase sin requerir service account key
 */

// Importar firebase client SDK usando ES modules
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, writeBatch, deleteDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: "AIzaSyAahNL2-uxj6wOGieWXdDUvcEx9Gdka-a0",
  authDomain: "ladico-3eef2.firebaseapp.com",
  projectId: "ladico-3eef2",
  storageBucket: "ladico-3eef2.firebasestorage.app",
  messagingSenderId: "622858666638",
  appId: "1:622858666638:web:f512807a2b6550f59d3fdf",
  measurementId: "G-HB4GCM2JX3"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mapeo de categorías (importado desde config)
const categoryMapping = {
  'BÚSQUEDA Y GESTIÓN DE INFORMACIÓN Y DATOS.json': {
    name: 'Búsqueda y Gestión de Información y Datos',
    code: 'BGID',
    order: 1,
    competences: ['1.1', '1.2', '1.3'],
    description: 'Competencias relacionadas con la búsqueda, evaluación, gestión y manejo de información digital',
    color: '#00a8e8'
  },
  'COMUNICACIÓN Y COLABORACIÓN.json': {
    name: 'Comunicación y Colaboración',
    code: 'CC',
    order: 2,
    competences: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6'],
    description: 'Competencias para comunicarse y colaborar a través de tecnologías digitales',
    color: '#a066b0'
  },
  'CREACIÓN DE CONTENIDOS DIGITALES.json': {
    name: 'Creación de Contenidos Digitales',
    code: 'CCD',
    order: 3,
    competences: ['3.1', '3.2', '3.3', '3.4'],
    description: 'Competencias para crear y editar contenidos digitales',
    color: '#ff7e29'
  },
  'RESOLUCIÓN DE PROBLEMAS.json': {
    name: 'Resolución de Problemas',
    code: 'RP',
    order: 4,
    competences: ['5.1', '5.2', '5.3', '5.4'],
    description: 'Competencias para identificar y resolver problemas técnicos y conceptuales',
    color: '#f25c54'
  },
  'seguridad.json': {
    name: 'Seguridad',
    code: 'SEG',
    order: 5,
    competences: ['4.1', '4.2', '4.3', '4.4'],
    description: 'Competencias para proteger dispositivos, datos personales y privacidad',
    color: '#88b04b'
  },
  'preguntas.json': {
    name: 'Preguntas Generales',
    code: 'GEN',
    order: 6,
    competences: ['1.1', '1.2', '1.3', '2.1', '2.2', '3.1', '4.1', '5.1'],
    description: 'Preguntas generales que cubren múltiples competencias',
    color: '#6c757d'
  }
};

/**
 * Función para limpiar colecciones
 */
async function clearCollections() {
  console.log('🧹 Limpiando colecciones existentes...');

  try {
    // Limpiar preguntas
    const questionsSnapshot = await getDocs(collection(db, 'questions'));
    const batch = writeBatch(db);

    questionsSnapshot.docs.forEach(document => {
      batch.delete(document.ref);
    });

    if (!questionsSnapshot.empty) {
      await batch.commit();
      console.log(`   ✅ ${questionsSnapshot.size} preguntas eliminadas`);
    }

    // Limpiar categorías  
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    const categoriesBatch = writeBatch(db);

    categoriesSnapshot.docs.forEach(document => {
      categoriesBatch.delete(document.ref);
    });

    if (!categoriesSnapshot.empty) {
      await categoriesBatch.commit();
      console.log(`   ✅ ${categoriesSnapshot.size} categorías eliminadas`);
    }

  } catch (error) {
    console.error('❌ Error limpiando colecciones:', error);
  }
}

/**
 * Función para crear categorías
 */
async function createCategories() {
  console.log('📂 Creando categorías...');

  const batch = writeBatch(db);
  let categoriesCreated = 0;

  for (const [filename, category] of Object.entries(categoryMapping)) {
    const categoryData = {
      id: category.code,
      name: category.name,
      code: category.code,
      order: category.order,
      competences: category.competences,
      description: category.description,
      color: category.color,
      questionCount: 0,
      createdAt: serverTimestamp(),
      isActive: true
    };

    const docRef = doc(db, 'categories', category.code);
    batch.set(docRef, categoryData);
    categoriesCreated++;

    console.log(`   📁 ${category.name} (${category.code})`);
  }

  await batch.commit();
  console.log(`✅ ${categoriesCreated} categorías creadas\n`);

  return categoriesCreated;
}

/**
 * Función para validar pregunta
 */
function validateQuestion(question, filename, index) {
  const errors = [];

  if (!question.type) errors.push('Falta tipo de pregunta');
  if (!question.title) errors.push('Falta título');
  if (!question.scenario) errors.push('Falta escenario');
  if (!question.options || !Array.isArray(question.options)) errors.push('Faltan opciones');
  if (typeof question.correctAnswerIndex !== 'number') errors.push('Falta índice de respuesta correcta');
  if (!question.feedback) errors.push('Falta retroalimentación');

  if (errors.length > 0) {
    console.warn(`⚠️  Pregunta ${index + 1} en ${filename}:`, errors.join(', '));
    return false;
  }

  return true;
}

/**
 * Función para subir preguntas de un archivo
 */
async function uploadQuestionsFromFile(filename, filePath) {
  console.log(`📄 Procesando: ${filename}`);

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const questions = JSON.parse(fileContent);

    if (!Array.isArray(questions)) {
      throw new Error('El archivo no contiene un array de preguntas');
    }

    const category = categoryMapping[filename];
    if (!category) {
      console.warn(`⚠️  No hay mapeo para: ${filename}`);
      return { uploaded: 0, skipped: questions.length };
    }

    console.log(`   📊 ${questions.length} preguntas encontradas`);

    const batch = writeBatch(db);
    let questionsUploaded = 0;
    let questionsSkipped = 0;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // Validar pregunta
      if (!validateQuestion(question, filename, i)) {
        questionsSkipped++;
        continue;
      }

      // Crear ID único
      const questionId = `${category.code}_${String(i + 1).padStart(3, '0')}`;

      const questionData = {
        id: questionId,
        categoryCode: category.code,
        categoryName: category.name,
        order: i + 1,
        type: question.type,
        competence: question.competence || 'N/A',
        level: question.level || 'Básico 1',
        title: question.title,
        scenario: question.scenario,
        options: question.options,
        correctAnswerIndex: question.correctAnswerIndex,
        feedback: question.feedback,
        createdAt: serverTimestamp(),
        isActive: true,
        source: filename
      };

      const docRef = doc(db, 'questions', questionId);
      batch.set(docRef, questionData);
      questionsUploaded++;
    }

    if (questionsUploaded > 0) {
      await batch.commit();

      // Actualizar conteo de preguntas en la categoría
      const categoryRef = doc(db, 'categories', category.code);
      await setDoc(categoryRef, {
        questionCount: questionsUploaded,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    }

    console.log(`   ✅ ${questionsUploaded} preguntas subidas`);
    if (questionsSkipped > 0) {
      console.log(`   ⚠️  ${questionsSkipped} preguntas omitidas`);
    }

    return { uploaded: questionsUploaded, skipped: questionsSkipped };

  } catch (error) {
    console.error(`❌ Error en ${filename}:`, error.message);
    return { uploaded: 0, skipped: 0, error: error.message };
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 SUBIENDO PREGUNTAS A FIRESTORE');
  console.log('📊 Proyecto:', firebaseConfig.projectId);
  console.log('⏰ Inicio:', new Date().toLocaleString('es-ES'));
  console.log('═'.repeat(50));

  const startTime = Date.now();
  let totalUploaded = 0;
  let totalSkipped = 0;
  let filesProcessed = 0;

  try {
    // Verificar conexión
    console.log('🔍 Verificando conexión a Firestore...');
    await getDocs(collection(db, 'categories'));
    console.log('✅ Conexión exitosa\n');

    // Limpiar colecciones
    await clearCollections();
    console.log('');

    // Crear categorías
    const categoriesCreated = await createCategories();

    // Procesar archivos de preguntas
    console.log('📝 Procesando archivos de preguntas...');

    const preguntasDir = path.resolve(__dirname, '../../preguntas');
    console.log(`📁 Directorio: ${preguntasDir}`);

    if (!fs.existsSync(preguntasDir)) {
      throw new Error(`No se encontró el directorio: ${preguntasDir}`);
    }

    const files = fs.readdirSync(preguntasDir).filter(file => file.endsWith('.json'));
    console.log(`📄 ${files.length} archivos JSON encontrados\n`);

    for (const filename of files) {
      const filePath = path.join(preguntasDir, filename);
      const result = await uploadQuestionsFromFile(filename, filePath);

      totalUploaded += result.uploaded;
      totalSkipped += result.skipped;
      filesProcessed++;

      console.log(''); // Línea en blanco
    }

    // Estadísticas finales
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('═'.repeat(50));
    console.log('📊 RESUMEN FINAL:');
    console.log(`⏱️  Tiempo: ${duration.toFixed(2)}s`);
    console.log(`📂 Categorías creadas: ${categoriesCreated}`);
    console.log(`📄 Archivos procesados: ${filesProcessed}/${files.length}`);
    console.log(`✅ Preguntas subidas: ${totalUploaded}`);
    console.log(`⚠️  Preguntas omitidas: ${totalSkipped}`);
    console.log('═'.repeat(50));

    if (totalUploaded > 0) {
      console.log('🎉 ¡Proceso completado exitosamente!');
    } else {
      console.log('⚠️  No se subieron preguntas. Verifica los archivos.');
    }

  } catch (error) {
    console.error('💥 Error fatal:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('\n🏁 Script finalizado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

export { main, uploadQuestionsFromFile, createCategories, clearCollections };
