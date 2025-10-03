import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'

const TextVectorizer = ({ onVectorGenerated, targetDimension = 10 }) => {
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [vectorizationMethod, setVectorizationMethod] = useState('simple')
  const [error, setError] = useState('')

  // Простая векторизация на основе хеширования слов
  const simpleVectorization = (text, dimension) => {
    const words = text.toLowerCase().match(/\b\w+\b/g) || []
    const vector = new Array(dimension).fill(0)
    
    // Используем простое хеширование для распределения слов по измерениям
    words.forEach(word => {
      let hash = 0
      for (let i = 0; i < word.length; i++) {
        const char = word.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Преобразуем в 32-битное целое
      }
      
      const index = Math.abs(hash) % dimension
      vector[index] += 1 / Math.sqrt(words.length) // Нормализация по длине
    })
    
    // Нормализуем вектор
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      return vector.map(val => val / magnitude)
    }
    
    return vector
  }

  // TF-IDF подобная векторизация
  const tfidfLikeVectorization = (text, dimension) => {
    const words = text.toLowerCase().match(/\b\w+\b/g) || []
    const wordFreq = {}
    
    // Подсчет частоты слов
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    })
    
    const vector = new Array(dimension).fill(0)
    const totalWords = words.length
    
    // Распределяем слова по измерениям с учетом частоты
    Object.entries(wordFreq).forEach(([word, freq]) => {
      let hash = 0
      for (let i = 0; i < word.length; i++) {
        const char = word.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      
      const index = Math.abs(hash) % dimension
      // TF-IDF подобная формула: частота слова * log(обратная частота документа)
      const tf = freq / totalWords
      const idf = Math.log(totalWords / freq) // Упрощенная IDF
      vector[index] += tf * idf
    })
    
    // Нормализация
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      return vector.map(val => val / magnitude)
    }
    
    return vector
  }

  // Семантическая векторизация на основе позиций символов
  const semanticVectorization = (text, dimension) => {
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '')
    const vector = new Array(dimension).fill(0)
    
    // Анализируем биграммы и триграммы
    for (let i = 0; i < cleanText.length - 1; i++) {
      const bigram = cleanText.slice(i, i + 2)
      let hash = 0
      
      for (let j = 0; j < bigram.length; j++) {
        hash = ((hash << 5) - hash) + bigram.charCodeAt(j)
        hash = hash & hash
      }
      
      const index = Math.abs(hash) % dimension
      vector[index] += 1
    }
    
    // Добавляем информацию о длине текста и разнообразии символов
    const uniqueChars = new Set(cleanText).size
    const textLength = cleanText.length
    
    // Распределяем метрики по измерениям
    vector[0] += textLength / 1000 // Нормализованная длина
    vector[1] += uniqueChars / 26 // Разнообразие символов
    
    // Нормализация
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      return vector.map(val => val / magnitude)
    }
    
    return vector
  }

  const handleVectorize = async () => {
    if (!inputText.trim()) {
      setError('Введите текст для векторизации')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      // Небольшая задержка для имитации обработки
      await new Promise(resolve => setTimeout(resolve, 500))

      let vector
      switch (vectorizationMethod) {
        case 'simple':
          vector = simpleVectorization(inputText, targetDimension)
          break
        case 'tfidf':
          vector = tfidfLikeVectorization(inputText, targetDimension)
          break
        case 'semantic':
          vector = semanticVectorization(inputText, targetDimension)
          break
        default:
          vector = simpleVectorization(inputText, targetDimension)
      }

      if (onVectorGenerated) {
        onVectorGenerated(vector, inputText)
      }

    } catch (error) {
      setError('Ошибка при векторизации текста: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClear = () => {
    setInputText('')
    setError('')
  }

  const getMethodDescription = (method) => {
    switch (method) {
      case 'simple':
        return 'Простое хеширование слов по измерениям'
      case 'tfidf':
        return 'TF-IDF подобная векторизация с учетом частоты слов'
      case 'semantic':
        return 'Семантический анализ на основе биграмм и метрик текста'
      default:
        return ''
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Семантическая векторизация текста</h3>
      
      <div className="space-y-4">
        {/* Метод векторизации */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Метод векторизации
          </label>
          <select
            value={vectorizationMethod}
            onChange={(e) => setVectorizationMethod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="simple">Простое хеширование</option>
            <option value="tfidf">TF-IDF подобный</option>
            <option value="semantic">Семантический анализ</option>
          </select>
          <div className="text-xs text-gray-500 mt-1">
            {getMethodDescription(vectorizationMethod)}
          </div>
        </div>

        {/* Поле ввода текста */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Текст для векторизации
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="6"
            placeholder="Введите текст, который нужно преобразовать в вектор..."
          />
          <div className="text-xs text-gray-500 mt-1">
            Целевая размерность: {targetDimension}
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-2">
          <Button 
            onClick={handleVectorize}
            disabled={isProcessing || !inputText.trim()}
            className="flex-1"
          >
            {isProcessing ? 'Обработка...' : 'Векторизовать'}
          </Button>
          <Button 
            onClick={handleClear}
            variant="outline"
            disabled={isProcessing}
          >
            Очистить
          </Button>
        </div>

        {/* Информация */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <strong>Как это работает:</strong>
          <ul className="mt-1 space-y-1">
            <li>• <strong>Простое хеширование:</strong> Каждое слово хешируется и распределяется по измерениям</li>
            <li>• <strong>TF-IDF подобный:</strong> Учитывается частота слов и их важность в тексте</li>
            <li>• <strong>Семантический:</strong> Анализируются биграммы, длина текста и разнообразие символов</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TextVectorizer

