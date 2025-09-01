#!/usr/bin/env node

/**
 * Script para subir todas las preguntas desde la carpeta /preguntas a Firestore
 * Uso: node scripts/firebase/upload-to-firestore.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuración de Firebase (usando el SDK web config)
const firebaseConfig = {
  apiKey: "AIzaSyAahNL2-uxj6wOGieWXdDUvcEx9Gdka-a0",
  authDomain: "ladico-3eef2.firebaseapp.com",
  projectId: "ladico-3eef2",
  storageBucket: "ladico-3eef2.firebasestorage.app",
  messagingSenderId: "622858666638",
  appId: "1:622858666638:web:f512807a2b6550f59d3fdf",
  measurementId: "G-HB4GCM2JX3"
}; }


// Mapeo de categorías
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

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId
  });
}

const db = admin.firestore();

/**
 * Función para limpiar colecciones existentes
 */
async function clearCollections() {
  console.log('🧹 Limpiando colecciones existentes...');

  try {
    // Limpiar colección de preguntas
    const questionsSnapshot = await db.collection('questions').get();
    const questionsBatch = db.batch();

    questionsSnapshot.docs.forEach(doc => {
      questionsBatch.delete(doc.ref);
    });

    if (!questionsSnapshot.empty) {
      await questionsBatch.commit();
      console.log(`   ✅ ${questionsSnapshot.size} preguntas eliminadas`);
    }

    // Limpiar colección de categorías
    const categoriesSnapshot = await db.collection('categories').get();
    const categoriesBatch = db.batch();

    categoriesSnapshot.docs.forEach(doc => {
      categoriesBatch.delete(doc.ref);
    });

    if (!categoriesSnapshot.empty) {
      await categoriesBatch.commit();
      console.log(`   ✅ ${categoriesSnapshot.size} categorías eliminadas`);
    }

  } catch (error) {
    console.error('❌ Error limpiando colecciones:', error);
    throw error;
  }
}

/**
 * Función para crear categorías en Firestore
 */
async function createCategories() {
  console.log('📂 Creando categorías...');

  const batch = db.batch();
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
      questionCount: 0, // Se actualizará después
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };

    const docRef = db.collection('categories').doc(category.code);
    batch.set(docRef, categoryData);
    categoriesCreated++;

    console.log(`   📁 ${category.name} (${category.code})`);
  }

  await batch.commit();
  console.log(`✅ ${categoriesCreated} categorías creadas exitosamente\n`);

  return categoriesCreated;
}

/**
 * Función para validar estructura de pregunta
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
    console.warn(`⚠️  Pregunta ${index + 1} en ${filename} tiene errores:`, errors);
    return false;
  }

  return true;
}

/**
 * Función para subir preguntas de un archivo
 */
async function uploadQuestionsFromFile(filename, filePath) {
  console.log(`📄 Procesando archivo: ${filename}`);

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const questions = JSON.parse(fileContent);

    if (!Array.isArray(questions)) {
      throw new Error('El archivo no contiene un array de preguntas');
    }

    const category = categoryMapping[filename];
    if (!category) {
      throw new Error(`No se encontró mapeo para el archivo: ${filename}`);
    }

    console.log(`   📊 ${questions.length} preguntas encontradas`);

    const batch = db.batch();
    let questionsUploaded = 0;
    let questionsSkipped = 0;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // Validar pregunta
      if (!validateQuestion(question, filename, i)) {
        questionsSkipped++;
        continue;
      }

      // Crear ID único: CATEGORY_CODE + número con padding
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        source: filename
      };

      const docRef = db.collection('questions').doc(questionId);
      batch.set(docRef, questionData);
      questionsUploaded++;
    }

    await batch.commit();

    // Actualizar conteo de preguntas en la categoría
    await db.collection('categories').doc(category.code).update({
      questionCount: questionsUploaded,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`   ✅ ${questionsUploaded} preguntas subidas exitosamente`);
    if (questionsSkipped > 0) {
      console.log(`   ⚠️  ${questionsSkipped} preguntas omitidas por errores`);
    }

    return { uploaded: questionsUploaded, skipped: questionsSkipped };

  } catch (error) {
    console.error(`❌ Error procesando ${filename}:`, error.message);
    return { uploaded: 0, skipped: 0, error: error.message };
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando proceso de subida de preguntas a Firestore');
  console.log('📊 Proyecto:', firebaseConfig.projectId);
  console.log('⏰ Fecha:', new Date().toLocaleString('es-ES'));
  console.log('=' * 60);

  const startTime = Date.now();
  let totalUploaded = 0;
  let totalSkipped = 0;
  let filesProcessed = 0;
  let filesWithErrors = 0;

  try {
    // Paso 1: Limpiar colecciones existentes
    await clearCollections();

    // Paso 2: Crear categorías
    const categoriesCreated = await createCategories();

    // Paso 3: Procesar archivos de preguntas
    console.log('📝 Subiendo preguntas...');

    const preguntasDir = path.join(__dirname, '../../preguntas');
    const files = fs.readdirSync(preguntasDir).filter(file => file.endsWith('.json'));

    console.log(`   📁 ${files.length} archivos JSON encontrados\n`);

    for (const filename of files) {
      const filePath = path.join(preguntasDir, filename);
      const result = await uploadQuestionsFromFile(filename, filePath);

      totalUploaded += result.uploaded;
      totalSkipped += result.skipped;
      filesProcessed++;

      if (result.error) {
        filesWithErrors++;
      }

      console.log(''); // Línea en blanco entre archivos
    }

    // Mostrar estadísticas finales
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('=' * 60);
    console.log('📊 RESUMEN FINAL:');
    console.log(`   ⏱️  Tiempo transcurrido: ${duration.toFixed(2)}s`);
    console.log(`   📂 Categorías creadas: ${categoriesCreated}`);
    console.log(`   📄 Archivos procesados: ${filesProcessed}/${files.length}`);
    console.log(`   ✅ Preguntas subidas: ${totalUploaded}`);
    console.log(`   ⚠️  Preguntas omitidas: ${totalSkipped}`);
    console.log(`   ❌ Archivos con errores: ${filesWithErrors}`);
    console.log('=' * 60);

    if (filesWithErrors === 0 && totalSkipped === 0) {
      console.log('🎉 ¡Proceso completado exitosamente!');
    } else if (filesWithErrors > 0) {
      console.log('⚠️  Proceso completado con algunos errores. Revisa los mensajes anteriores.');
    } else {
      console.log('✅ Proceso completado. Algunas preguntas fueron omitidas por errores de validación.');
    }

  } catch (error) {
    console.error('💥 Error fatal durante el proceso:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🏁 Script finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { main, uploadQuestionsFromFile, createCategories, clearCollections };
