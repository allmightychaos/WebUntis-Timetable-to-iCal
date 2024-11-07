// src/core/utils.js

function createElementMap(elements, key = 'name', altKey = null) {
      const map = {};
      elements.forEach(el => {
            map[el.id] = { [key]: el[key], ...(altKey ? { [altKey]: el[altKey] } : {}) };
      });
      return map;
}

function formatTime(time) {
      return time.toString().padStart(4, '0').replace(/(\d{2})(\d{2})/, '$1:$2');
}

function formatDate(date) {
      const dateStr = date.toString();
      return dateStr.length === 8
            ? `${dateStr.slice(6, 8)}.${dateStr.slice(4, 6)}.${dateStr.slice(0, 4)}`
            : 'Invalid Date';
}

function capitalizeFirstLetter(string) {
      return string
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
}

function getColorByCellState(cellState) {
      const colors = {
            'STANDARD': '#B4F8B4',
            'CANCEL': '#C5C6C6',
            'SHIFT': '#B5A0C1',
            'EXAM': '#F5F1C1',
            'SUBSTITUTION': '#B79CC4'
      };
      return colors[cellState] || null;
}

export { createElementMap, formatTime, formatDate, capitalizeFirstLetter, getColorByCellState };
