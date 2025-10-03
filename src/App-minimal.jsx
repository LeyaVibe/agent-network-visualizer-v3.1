import React, { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Визуализатор динамики связей в группе агентов
          </h1>
          <p className="text-gray-600">
            Интерактивное моделирование социальных взаимодействий и формирования связей
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Тест приложения</h2>
          <p>Счетчик: {count}</p>
          <button 
            onClick={() => setCount(count + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Увеличить
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
