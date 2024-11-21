let db;
let tasks = [];
let currentTaskId = null;
let taskModal;

document.addEventListener('DOMContentLoaded', function() {
    taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
    initDB();
});

function initDB() {
    const request = indexedDB.open('TaskManagerDB', 1);

    request.onerror = function(event) {
        console.error("IndexedDB error:", event.target.error);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        loadTasks();
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        const objectStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('status', 'status', { unique: false });
    };
}

function loadTasks() {
    const transaction = db.transaction(['tasks'], 'readonly');
    const objectStore = transaction.objectStore('tasks');
    const request = objectStore.getAll();

    request.onerror = function(event) {
        console.error("Load tasks error:", event.target.error);
    };

    request.onsuccess = function(event) {
        tasks = event.target.result;
        renderAllTasks();
    };
}

function renderAllTasks() {
    document.querySelectorAll('.card-list').forEach(list => list.innerHTML = '');
    tasks.forEach(task => renderTask(task));
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const draggedElement = document.getElementById(data);
    const dropzone = ev.target.closest('.card-list');
    if (dropzone) {
        dropzone.appendChild(draggedElement);
        updateTaskStatus(data, dropzone.closest('.card-body').id);
    }
}

function updateTaskStatus(taskId, newStatus) {
    const task = tasks.find(t => `task-${t.id}` === taskId);
    if (task) {
        task.status = newStatus;
        updateTask(task);
    }
}

function toggleColumn(headerElement) {
    const cardBody = headerElement.closest('.card').querySelector('.card-body');
    cardBody.classList.toggle('collapsed');
    const icon = headerElement.querySelector('h5');
    icon.textContent = icon.textContent.includes('▼') ? 
        icon.textContent.replace('▼', '▶') : 
        icon.textContent.replace('▶', '▼');
}

function createTask(title, description, requester, startDate, endDate, priority, status) {
    const task = {
        title,
        description,
        requester,
        startDate,
        endDate,
        priority,
        status
    };

    const transaction = db.transaction(['tasks'], 'readwrite');
    const objectStore = transaction.objectStore('tasks');
    const request = objectStore.add(task);

    request.onerror = function(event) {
        console.error("Add task error:", event.target.error);
    };

    request.onsuccess = function(event) {
        task.id = event.target.result;
        tasks.push(task);
        renderTask(task);
    };
}

function renderTask(task) {
    const card = document.createElement('div');
    card.id = `task-${task.id}`;
    card.className = 'card task-card';
    card.draggable = true;
    card.ondragstart = drag;
    card.onclick = () => openModal(task.id);
    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${task.title}</h5>
            <p class="card-text">요청자: ${task.requester}</p>
            <p class="card-text">우선순위: ${task.priority}</p>
        </div>
    `;
    document.querySelector(`#${task.status} .card-list`).appendChild(card);
}

function openModal(taskId) {
    currentTaskId = taskId;
    const task = tasks.find(t => t.id === taskId);
    document.getElementById('modalTitle').textContent = '업무 상세';
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description;
    document.getElementById('taskRequester').value = task.requester;
    document.getElementById('taskStartDate').value = task.startDate;
    document.getElementById('taskEndDate').value = task.endDate;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('deleteButton').style.display = 'inline-block';
    taskModal.show();
}

function openNewTaskModal() {
    currentTaskId = null;
    document.getElementById('modalTitle').textContent = '새 업무 추가';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskRequester').value = '';
    document.getElementById('taskStartDate').value = '';
    document.getElementById('taskEndDate').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskStatus').value = 'todo';
    document.getElementById('deleteButton').style.display = 'none';
    taskModal.show();
}

function closeModal() {
    taskModal.hide();
}

function saveTask() {
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const requester = document.getElementById('taskRequester').value;
    const startDate = document.getElementById('taskStartDate').value;
    const endDate = document.getElementById('taskEndDate').value;
    const priority = document.getElementById('taskPriority').value;
    const status = document.getElementById('taskStatus').value;

    if (currentTaskId === null) {
        createTask(title, description, requester, startDate, endDate, priority, status);
    } else {
        const task = tasks.find(t => t.id === currentTaskId);
        task.title = title;
        task.description = description;
        task.requester = requester;
        task.startDate = startDate;
        task.endDate = endDate;
        task.priority = priority;
        task.status = status;

        updateTask(task);
    }
    
    closeModal();
}

function updateTask(task) {
    const transaction = db.transaction(['tasks'], 'readwrite');
    const objectStore = transaction.objectStore('tasks');
    const request = objectStore.put(task);

    request.onerror = function(event) {
        console.error("Update task error:", event.target.error);
    };

    request.onsuccess = function() {
        const card = document.getElementById(`task-${task.id}`);
        card.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${task.title}</h5>
                <p class="card-text">요청자: ${task.requester}</p>
                <p class="card-text">우선순위: ${task.priority}</p>
            </div>
        `;
        const newColumn = document.querySelector(`#${task.status} .card-list`);
        newColumn.appendChild(card);
    };
}

function deleteTask() {
    if (currentTaskId !== null) {
        const transaction = db.transaction(['tasks'], 'readwrite');
        const objectStore = transaction.objectStore('tasks');
        const request = objectStore.delete(currentTaskId);

        request.onerror = function(event) {
            console.error("Delete task error:", event.target.error);
        };

        request.onsuccess = function() {
            const taskIndex = tasks.findIndex(t => t.id === currentTaskId);
            if (taskIndex !== -1) {
                tasks.splice(taskIndex, 1);
                document.getElementById(`task-${currentTaskId}`).remove();
                closeModal();
                currentTaskId = null;
            }
        };
    }
}