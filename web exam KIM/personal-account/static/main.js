const DEFAULT_URL = 'http://exam-2023-1-api.std-900.ist.mospolytech.ru/api';
const API_KEY = '2e1c5db9-f013-4439-9494-0a44e2fd1372';
const PER_PAGE = 3;
const MAX_TEXT_SELECT_SIZE = 30;
// время "жизни" уведомления
const alertRemoveTime = 5000;
const linkPersonalAccount = '<a href="#">Личный кабинет</a>';
const rubleSymbol = '\u20bd';

// определение основных конструкций
// контейнер для уведомлений
let alertContainer = document.querySelector('.alert-container');
// уведомление-шаблон
let tempAlert = document.querySelector('#alert-template');
// уведомление об успешной операции
let successAlert = document.querySelector('#alert-success');
let dangerAlert = document.querySelector('#alert-danger');
let idRequestDelModal =
    document.querySelector('#delete-request').querySelector('.id-request');
let modalShowRequest = document.querySelector('#show-request');
let modalEditRequest = document.querySelector('#edit-request');
let hiddenIdValue = document.querySelector('#request-id');
let delRequestBtn = document.querySelector('.del-request-btn');

let itemOfAvailableRequests =
    document.querySelector('#item-of-available-requests');
let availableRequests = document.querySelector('.table-of-available-requests');
let controlItems = document.querySelector('#control-items');

let tempGuides = document.querySelector('#table-of-guides');
let tableGuides = document.querySelector('.table-guides');
let paginationContainer = document.querySelector('.pagination-bar');
// модальное окно
// кнопка для создания заявки
let buttonCreateRequest = document.querySelector('#buttonSendRequest');

/**
 * Функция для взаимодействия с сервером
 * @param {string} method - метод запроса (get, post, put, delete)
 * @param {string} type - тип запрашиваемого ресурса 
 * (routes, orders, guide, route);
 * type = guide, route используются для получения данных о 
 * конкретном гиде или маршруте
 * @param {object} params - параметры, передаваемые серверу
 * @param {number} id - идентификатор маршрута или заявки
 * @returns {object} - объект json, содержащий ответ сервера
 */
async function dataExchangeWithTheServer(method, type, params, id) {
    let error = false;
    let data = {};
    let url;
    if (method != undefined && type != undefined) {
        if (method == 'get') {
            if (type == 'routes') {
                if (id != undefined) {
                    // получить список гидов
                    url = new URL(`${DEFAULT_URL}/routes/${id}/guides`);
                } else {
                    // получить список маршрутов
                    url = new URL(`${DEFAULT_URL}/routes`);
                }
            };
            if (type == 'orders') {
                if (id != undefined) {
                    // посмотреть заявку
                    url = new URL(`${DEFAULT_URL}/orders/${id}`);
                } else {
                    // получить спсок заявок
                    url = new URL(`${DEFAULT_URL}/orders`);
                }
            }
            // если нужно получить информацию о конкретном гиде
            if (type == 'guide') {
                if (id != undefined) {
                    url = new URL(`${DEFAULT_URL}/guides/${id}`);
                } else {
                    error = true;
                }
            }
            // если нужно получить информацию о конкретном маршруте
            if (type == 'route') {
                if (id != undefined) {
                    url = new URL(`${DEFAULT_URL}/routes/${id}`);
                } else {
                    error = true;
                }
            }
        }
        if (method == 'post' && type == 'orders') {
            // добавить заявку
            url = new URL(`${DEFAULT_URL}/orders`);
        }
        if ((method == 'put' || method == 'delete')
            && type == 'orders' && id != undefined) {
            // редактировать или удалить заявку
            url = new URL(`${DEFAULT_URL}/orders/${id}`);
        }
    } else {
        error = true;
    }
    let bodyParams;
    if (params && Object.keys(params).length > 0) {
        bodyParams = new URLSearchParams();
        for (let i = 0; i < Object.keys(params).length; i++) {
            bodyParams.set(Object.keys(params)[i],
                params[Object.keys(params)[i]]);
        }
    }
    if (url != undefined) {
        url.searchParams.append('api_key', API_KEY);
        // отправка запросов
        data = await fetch(url, {
            method: method.toUpperCase(),
            body: bodyParams,
        }).then(response => response.json()).then(answer => {
            return answer;
        });
    } else {
        error = true;
    }
    if (error) console.log("Произошла ошибка при обмене данными с сервером");
    return data;
}

/**
 * Функция для вывода уведомления на экран
 * @param {String} type - тип уведомления: success, warning or danger
 * @param {String} text - текст, который необходимо вывести в уведомлении
 */
function showAlert(type, text) {
    // клонирование шаблона уведомления
    let alertItem = tempAlert.content.firstElementChild.cloneNode(true);
    let alertSetStyle = alertItem.querySelector('#alertSetStyle');
    alertSetStyle.classList.remove('alert-warning');
    alertSetStyle.classList.remove('alert-success');
    alertSetStyle.classList.remove('alert-danger');
    if (type == 'warning') {
        alertSetStyle.classList.add('alert-warning');
        alertItem.querySelector('.text-alert-item').innerHTML = text;
    }
    if (type == 'success') {
        alertSetStyle.classList.add('alert-success');
        alertItem.querySelector('.text-alert-item').innerHTML = text;
    }
    if (type == 'danger') {
        alertSetStyle.classList.add('alert-danger');
        alertItem.querySelector('.text-alert-item').innerHTML = text;

    }
    // добавление в контейнер для уведомлений
    alertContainer.append(alertItem);
    // задание удаления уведомления по таймеру 
    setTimeout(() => alertItem.remove(), alertRemoveTime);
}

/**
 * Функция вычисляющая стоимость экскурсии
 * @param {*} guideServiceCost - стоимость услуг гида за один час
 * @param {*} hoursNumber - длительность экскурсии в часах
 * @param {*} isThisDayOff = множитель, отвечающий за повышение стоимости
 * в праздничные и выходные дни. Для будней равне 1, для праздничных и выходных
 * дней (сб,вс) - 1,5
 * @param {*} isItMorning - надбавка за ранее время экскурсии. Для экскурсий,
 * которые начинаются с 9 до 12 часов, равна 400 рублей, для остальных - 0
 * @param {*} isItEvening - надбавка за вечернее время экскурсии. Для экскурсий,
 * которые начинаются с 20 до 23 часов, равна 1000 рублей, для остальных - 0
 * @param {*} numberOfVisitors - надбавка за количество посетителей экскурсии
 * от 1 до 5 человек - 0 рублей
 * от 5 до 10 - 1000 рублей
 * от 10 до 20 - 1500 рублей
 * @returns {Number} - стоимость экскурсии
 */
function calculateCost(guideServiceCost,
    hoursNumber, isThisDayOff, isItMorning,
    isItEvening, numberOfVisitors) {
    // 1, чтобы умножение происходило корректно
    let totalCost = 1;
    // стоимость услуг гида
    totalCost *= guideServiceCost;
    // длительность экскурсии
    totalCost *= hoursNumber;
    // повышение для празничных дней
    if (isThisDayOff) {
        totalCost *= 1.5;
    }
    // прибавление надбавки за утренее время
    if (isItMorning) {
        totalCost += 400;
    }
    // прибавление надбавки за вечернее время
    if (isItEvening) {
        totalCost += 1000;
    }
    // надбавка за количество посетителей экскурсии
    if (numberOfVisitors > 5 && numberOfVisitors <= 10) {
        totalCost += 1000;
    }
    if (numberOfVisitors > 10 && numberOfVisitors <= 20) {
        totalCost += 1500;
    }
    return totalCost;
}

function checkStartTime(concatDate) {
    let chosenHour = concatDate.getHours();
    let chosenMinute = concatDate.getMinutes();
    if (chosenMinute % 30 != 0) {
        if (chosenMinute > 30) {
            chosenMinute = '00';
            chosenHour += 1;
        } else {
            chosenMinute = '30';
        }
    }
    if (chosenHour < 9) {
        chosenHour = '09';
        chosenMinute = '00';
        return `${chosenHour}:${chosenMinute}`;
    }
    if (chosenHour + Number(duration.value) > 23) {
        chosenHour = `${23 - Number(duration.value)}`;
        chosenMinute = '00';
    }
    if (chosenMinute == 0) chosenMinute = '00';
    if (chosenHour < 10) chosenHour = `0${chosenHour}`;
    return `${chosenHour}:${chosenMinute}`;
}

function getCurrentDate() {
    // заполнение даты экскурсии текущей датой
    let timeNow = new Date();
    let yearNow = `${timeNow.getFullYear()}`;
    let monthNow = timeNow.getMonth() + 1 >= 10 ? `${timeNow.getMonth()}` :
        `0${timeNow.getMonth() + 1}`;
    let dayNow = timeNow.getDate() + 1 >= 10 ? `${timeNow.getDate() + 1}` :
        `0${timeNow.getDate() + 1}`;
    return yearNow + "-" + monthNow + "-" + dayNow;
}

/**
 * Функция, рассчитывающая и обновляющая итоговую стоимость экскурсии
 * @param {*} event - событие
 */
function changeFieldRequestHandler(event) {
    // обращение к модальному окну
    let modalWindow = document.querySelector("#edit-request");
    // получение данных формы
    let formInputs = modalWindow.querySelector("form").elements;
    // получение необходимых полей
    let priceGuide = formInputs['priceGuide'];
    let excursionDate = formInputs['excursion-date'];
    let startTime = formInputs['start-time'];
    let duration = formInputs['duration'];
    let numberOfPeople = formInputs['number-of-people'];
    let option1 = formInputs['option-1'];
    let option2 = formInputs['option-2'];
    let totalCost = formInputs['total-cost'];
    let concatDate = new Date(excursionDate.value + ' ' + startTime.value);
    let nowDate = new Date();
    if (concatDate <= nowDate) {
        excursionDate.value = getCurrentDate();
        concatDate = new Date(excursionDate.value + ' ' + startTime.value);
    };
    startTime.value = checkStartTime(concatDate);
    if (excursionDate.value != '' && startTime.value != '') {
        let isThisDayOff = concatDate.getDay() == 6 || concatDate.getDay() == 0;
        let isItMorning = concatDate.getHours() >= 9 &&
            concatDate.getHours() <= 12;
        let isItEvening = concatDate.getHours() >= 20 &&
            concatDate.getHours() <= 23;
        let calculateTotalCost = calculateCost(priceGuide.value,
            duration.value, isThisDayOff, isItMorning,
            isItEvening, numberOfPeople.value);

        let option1amount = formInputs['discount-amount-1'];
        let option2amount = formInputs['discount-amount-2'];
        if (option1.checked) {
            let temp = calculateTotalCost;
            calculateTotalCost *= 0.85;
            option1amount.value = "-" + parseInt(temp - calculateTotalCost) +
                " рублей";
        } else {
            option1amount.value = "-"
        };
        if (option2.checked) {
            let temp = calculateTotalCost;
            calculateTotalCost *= 0.72;
            option2amount.value = "-" + parseInt(calculateTotalCost - temp) +
                " рублей";
        } else {
            option2amount.value = "-"
        };

        totalCost.value = String(Math.ceil(calculateTotalCost)) +
            ' ' + rubleSymbol;
        buttonCreateRequest.dataset.bsDismiss = 'modal';
    } else {
        delete buttonCreateRequest.dataset.bsDismiss;
        console.log('Заполните, пожалуйста все поля');
    }
}


/**
 * Функция-обработчик для элементов управления
 * @param {object} event - событие 
 */
async function controlItemsHandler(event) {
    let action = event.target.dataset.action;
    if (action) {
        let clickOnRow = event.target.closest('.row');
        let idRequest = clickOnRow.querySelector('.id').innerHTML;
        if (action == 'delete') {
            idRequestDelModal.innerHTML = `№ ${idRequest}`;
            hiddenIdValue.value = idRequest;
        }
        if (action == 'show') {
            document.querySelector('#id-request-show').innerHTML = idRequest;
            let dataRequest =
                await dataExchangeWithTheServer('get', 'orders', {}, idRequest);
            let dataGuide =
                await dataExchangeWithTheServer('get', 'guide', {},
                    dataRequest.guide_id);
            let dataRoute =
                await dataExchangeWithTheServer('get', 'route', {},
                    dataRequest.route_id);
            let formInputs = modalShowRequest.querySelector("form").elements;
            let nameGuide = formInputs['fio-guide-show'];
            let nameRoute = formInputs['route-name-show'];
            let dateExcursion = formInputs['excursion-date-show'];
            let startTime = formInputs['start-time-show'];
            let duration = formInputs['duration-show'];
            let numberOfPeople = formInputs['number-of-people-show'];
            let option1 = formInputs['option-1-show'];
            let option2 = formInputs['option-2-show'];
            let nameOption1 = modalShowRequest.querySelector('.option-1\
            ').querySelector('.form-check-label');
            let nameOption2 = modalShowRequest.querySelector('.option-2\
            ').querySelector('.form-check-label');
            let descOption1 = modalShowRequest.querySelector('.option-1\
            ').querySelector('.description');
            let descOption2 = modalShowRequest.querySelector('.option-2\
            ').querySelector('.description');
            let discountOption1 = formInputs['discount-amount-1-show'];
            let discountOption2 = formInputs['discount-amount-2-show'];
            let totalCost = formInputs['total-cost-show'];
            nameGuide.value = dataGuide.name;
            nameRoute.value = dataRoute.name;
            dateExcursion.value = dataRequest.date;
            startTime.value = dataRequest.time;
            duration.value = dataRequest.duration;
            numberOfPeople.value = dataRequest.persons;
            option1.checked = Boolean(dataRequest.optionFirst);
            option2.checked = Boolean(dataRequest.optionSecond);
            nameOption1.innerHTML = 'Скидка для школьников и студентов';
            nameOption2.innerHTML = 'Скидка для пенсионеров';
            descOption1.innerHTML = 'Стоимость уменьшается на';
            descOption2.innerHTML = 'Стоимость уменьшается на ';
            discountOption1.value = '15%';
            discountOption2.value = '25%';
            totalCost.value = dataRequest.price;
        }
        if (action == 'edit') {
            document.querySelector('#id-request-edit').innerHTML = idRequest;
            let dataRequest =
                await dataExchangeWithTheServer('get', 'orders', {}, idRequest);
            let dataGuide =
                await dataExchangeWithTheServer('get', 'guide', {},
                    dataRequest.guide_id);
            let dataRoute =
                await dataExchangeWithTheServer('get', 'route', {},
                    dataRequest.route_id);
            let formInputs = modalEditRequest.querySelector("form").elements;
            let nameGuide = formInputs['fio-guide'];
            let priceGuide = formInputs['priceGuide'];
            let nameRoute = formInputs['route-name'];
            let dateExcursion = formInputs['excursion-date'];
            let startTime = formInputs['start-time'];
            let duration = formInputs['duration'];
            let numberOfPeople = formInputs['number-of-people'];
            let option1 = formInputs['option-1'];
            let option2 = formInputs['option-2'];
            let nameOption1 = modalEditRequest.querySelector('.option-1\
            ').querySelector('.form-check-label');
            let nameOption2 = modalEditRequest.querySelector('.option-2\
            ').querySelector('.form-check-label');
            let descOption1 = modalEditRequest.querySelector('.option-1\
            ').querySelector('.description');
            let descOption2 = modalEditRequest.querySelector('.option-2\
            ').querySelector('.description');
            let discountOption1 = formInputs['discount-amount-1'];
            let discountOption2 = formInputs['discount-amount-2'];
            let totalCost = formInputs['total-cost'];
            nameGuide.value = dataGuide.name;
            priceGuide.value = dataGuide.pricePerHour;
            nameRoute.value = dataRoute.name;
            dateExcursion.value = dataRequest.date;
            dateExcursion.dataset.oldDate = dataRequest.date;
            startTime.value = dataRequest.time;
            startTime.dataset.oldTime = dataRequest.time.slice(0, 5);
            duration.value = dataRequest.duration;
            duration.dataset.oldDuration = dataRequest.duration;
            numberOfPeople.value = dataRequest.persons;
            numberOfPeople.dataset.oldPersons = dataRequest.persons;
            option1.checked = Boolean(dataRequest.optionFirst);
            option1.dataset.oldOption1 = Number(dataRequest.optionFirst);
            option2.checked = Boolean(dataRequest.optionSecond);
            option2.dataset.oldOption2 = Number(dataRequest.optionSecond);
            nameOption1.innerHTML = 'Скидка для школьников и студентов';
            nameOption2.innerHTML = 'Скидка для пенсионеров';
            descOption1.innerHTML = 'Стоимость уменьшается на';
            descOption2.innerHTML = 'Стоимость уменьшается на';
            discountOption1.value = '15%';
            discountOption2.value = '25%';
            totalCost.value = dataRequest.price + ' ' + rubleSymbol;
            totalCost.dataset.oldTotalCost = dataRequest.price;
        }
    }
}


/**
 * Функция для создания кнопки для навигации по страницам
 * @param {number} page - страница
 * @param {object} classes - назначенные классы
 * @returns {button} - кнопка
 */
function createPageBtn(page, classes = []) {
    // создание кнопки-ссылки
    // сслыка используется для того, 
    // чтобы при нажатии возвращаться в начало выдачи результатов
    let btn = document.createElement('a');
    // в цикле кнопке назначаются классы 
    for (cls of classes) {
        btn.classList.add(cls);
    }
    // добавление стилей bootstrap
    btn.classList.add('page-link');
    btn.classList.add('d-flex');
    btn.classList.add('align-items-center');
    // установка данных внутрь кода кнопки 
    btn.dataset.page = page;
    // присвоение номера страницы кнопке 
    btn.innerHTML = page;
    // назначение якоря на начало выдачи результатов
    btn.href = '#label-search-field';
    return btn;
}


/**
 * Функция для обработки выбора гида (нажатия кнопки "выбрать")
 * В результате срабатывания нажатия появляется модальное окно
 * @param {object} event - событие
 */
async function buttonChooseGuideHandler(event) {
    // получение идентификатора гида
    let guideId = event.target.closest('.row').dataset.idGuide;
    // получение данных о гиде
    let dataGuide = await dataExchangeWithTheServer('get',
        'guide', {}, guideId);
    // получение данных о маршруте
    let dataRoute = await dataExchangeWithTheServer('get',
        'route', {}, dataGuide.route_id);
    // обращение к модальному окну
    let modalWindow = document.querySelector("#createRequest");
    // сброс формы
    modalWindow.querySelector('form').reset();
    // получение елементов формы
    let formInputs = modalWindow.querySelector("form").elements;
    // получение необходимых полей
    let fio = formInputs['fio-guide'];
    let idGuide = formInputs['idGuide'];
    let priceGuide = formInputs['priceGuide'];
    let routeName = formInputs['route-name'];
    let idRoute = formInputs['idRoute'];
    let excursionDate = formInputs['excursion-date'];
    let option1Name = modalWindow.querySelector('#createRequest \
        .option-1 .form-check-label');
    let option1Desc = modalWindow.querySelector('#createRequest \
        .option-1 .description');
    let option1amount = formInputs['discount-amount-1'];
    let option2Name = modalWindow.querySelector('#createRequest \
        .option-2 .form-check-label');
    let option2Desc = modalWindow.querySelector('#createRequest \
        .option-2 .description');
    let option2amount = formInputs['discount-amount-2'];
    // заполнение полей необходимыми данными
    fio.value = dataGuide.name;
    idGuide.value = dataGuide.id;
    priceGuide.value = dataGuide.pricePerHour;
    routeName.value = dataRoute.name;
    idRoute.value = dataRoute.id;
    excursionDate.value = getCurrentDate();
    option1Name.innerHTML = 'Скидка для школьников и студентов';
    option1Desc.innerHTML = 'Стоимость уменьшается на';
    option1amount.value = '15%';
    option2Name.innerHTML = 'Скидка для пенсионеров';
    option2Desc.innerHTML = 'Стоимоть уменьшается на';
    option2amount.value = '25%';
    changeFieldRequestHandler();
}


/**
 * Функция для загрузки на страницу данных о доступных маршрутах
 * @param {object} data - данные о доступных заявках
 * 
 */
async function renderAvailableRoutes(data, routes) {
    // очистка прошлых данных
    availableRequests.innerHTML = '';
    // формирование шапки таблицы путем клонирования шаблона
    let itemOfAvailableRequest =
        itemOfAvailableRequests.content.firstElementChild.cloneNode(true);
    // добавление шапки таблицы в таблицу
    availableRequests.append(itemOfAvailableRequest);
    // перебор и вывод строк таблицы
    for (let i = 0; i < data.length; i++) {
        // формирование элемента путем клонирования шаблона
        itemOfAvailableRequest =
            itemOfAvailableRequests.content.firstElementChild.cloneNode(true);
        // назначение номера заявки
        itemOfAvailableRequest.querySelector('.id').innerHTML =
            data[i]['id'];
        // назначение описания маршрута
        let nameRoute = await dataExchangeWithTheServer('get',
            'route', {}, data[i]['route_id']);
        itemOfAvailableRequest.querySelector('.name').innerHTML =
            nameRoute.name;
        // назначение даты экскурсии
        itemOfAvailableRequest.querySelector('.date').innerHTML =
            data[i]['date'];
        // назначение цены экскурсии
        itemOfAvailableRequest.querySelector('.cost').innerHTML =
            data[i]['price'];
        // выбор области кнопки для выбора маршрута
        let choose = itemOfAvailableRequest.querySelector('.control');
        choose.innerHTML = '';
        choose.onclick = controlItemsHandler;
        itemControl = controlItems.content.firstElementChild.cloneNode(true);
        choose.append(itemControl);
        // добавление строки таблицы в таблицу
        availableRequests.append(itemOfAvailableRequest);
    }
}

/**
 * Функция для отрисовки элементов навигации
 * @param {*} currentPage - номер текущей страницы
 * @param {*} totalPages - общее количество страниц
 */
function renderPaginationElement(currentPage, totalPages) {
    // страховка, на случай, если будет передана строка, содержащия число
    currentPage = parseInt(currentPage);
    totalPages = parseInt(totalPages);
    // объявление кнопки и инициализация раздела навигации по страницам
    let btn;
    let li;
    // обнуление прошлых значений
    paginationContainer.innerHTML = '';

    // создание контейнера, для хранения кнопок навигации по страницам
    let buttonsContainer = document.createElement('ul');
    // назначаение класса
    buttonsContainer.classList.add('pagination');

    // создание кнопки "Первая страница"
    btn = createPageBtn(1, ['first-page-btn']);
    btn.innerHTML = 'Первая страница';
    // создание элемента списка и назначение необходимых классов
    li = document.createElement('li');
    li.classList.add('page-item');
    // если страница 1, то скрытие кнопки "Первая страница"
    if (currentPage == 1) {
        li.classList.add('disabled');
    }
    li.append(btn);
    // добавление кнопки "Первая страница" в контейнер для кнопок
    buttonsContainer.append(li);

    // вычисление максимального и минимального значения
    let start = Math.max(currentPage - 2, 1);
    let end = Math.min(currentPage + 2, totalPages);
    // в цикле созданются и добавляются кнопки для навигации по страницам
    for (let i = start; i <= end; i++) {
        let li = document.createElement('li');
        li.classList.add('page-item');
        btn = createPageBtn(i, i == currentPage ? ['active'] : []);
        li.append(btn);
        buttonsContainer.append(li);
    }

    // создание кнопки "Последняя страница"
    btn = createPageBtn(totalPages, ['last-page-btn']);
    btn.innerHTML = 'Последняя страница';
    // создание элемента списка и назначение необходимых классов
    li = document.createElement('li');
    li.classList.add('page-item');
    // кнопка скрывается при достижении конца страниц или при их отсутствии
    if (currentPage == totalPages || totalPages == 0) {
        li.classList.add('disabled');
    }
    li.append(btn);
    // добавление кнопки "Последняя страница" в контейнер для кнопок
    buttonsContainer.append(li);

    // добавление всех кнопок в контейнер
    paginationContainer.append(buttonsContainer);
}

/**
 * Функция для вывода ограниченного количества данных о доступных маршрутах
 * @param {number} page - нужная страница
 * @param {number} perPage - количество элементов на странице
 * @param {string} qParam - заменитель параметра "q", 
 * который обычно используется в url
 */
async function generateAvailableRequest(page, perPage, qParam) {
    let data = await dataExchangeWithTheServer('get', 'orders');
    document.querySelector('#availableRequest').innerHTML =
        `Оставленные заявки (количество: ${data.length})`;
    // обнуление данных для отображения на странице
    let dataToRender = [];
    // вычисление колическтва страниц
    let totalPages = Math.ceil(data.length / perPage);
    // если значение страницы выходит за допустимые пределы
    if (page > totalPages && page < 1) {
        availableRequests.innerHTML = 'Ошибка: выход за \
        пределы доступных страниц';
    } else {
        if (Object.keys(data).length == 0) {
            availableRequests.innerHTML = '';
            paginationContainer.innerHTML = '';
            // добавление уведомления вместо таблицы
            // let divError = document.createElement('div');
            // divError.classList.add('d-flex');
            // divError.classList.add('justify-content-center');
            // let div = document.createElement('div');
            // div.innerHTML = 'По данному запросу ничего не найдено :(';
            // divError.append(div);
            // availableRequests.append(divError);

            let text = 'Заявки не найдены :(<br>\
                    Чтобы создать заявку, пожалуйста, перейдите на \
                    <a href="../index.html">главную страницу</a>';
            showAlert('warning', text);
            return;
        }
        // иначе добавляются данные для отображения в определнном количестве
        let max = Math.min(page * perPage, data.length);
        for (let i = (page - 1) * perPage; i < max; i++) {
            dataToRender.push(data[i]);
        }
        // вызов функций отображения маршрутов и панели навигации по страницам
        await renderAvailableRoutes(dataToRender);
        renderPaginationElement(page, totalPages);
    }
}

/**
 * Функция обрабатывающая нажатие клавиши в модальном окне,
 * предназначенном для создания заявки
 * @param {object} event - событие 
 */
async function buttonSendRequestHandler(event) {
    let modalWindow = event.target.closest(".modal");
    let form = modalWindow.querySelector("form");
    let formInputs = form.elements;
    if (formInputs['excursion-date'].value != '' &&
        formInputs['start-time'].value) {
        let params = {};
        // 'date': formInputs['excursion-date'].value,
        // 'time': formInputs['start-time'].value,
        // 'duration': formInputs['duration'].value,
        // 'persons': formInputs['number-of-people'].value,
        // 'duration': formInputs['duration'].value,
        // 'price': formInputs['total-cost'].value.split(' ')[0],
        // 'optionFirst': Number(formInputs['option-1'].checked),
        // 'optionSecond': Number(formInputs['option-2'].checked),
        let dateExcursion = formInputs['excursion-date'];
        let startTime = formInputs['start-time'];
        let duration = formInputs['duration'];
        let numberOfPeople = formInputs['number-of-people'];
        let option1 = formInputs['option-1'];
        let option2 = formInputs['option-2'];
        let totalCost = formInputs['total-cost'];
        if (dateExcursion.value != dateExcursion.dataset.oldDate) {
            params.date = dateExcursion.value;
        }
        if (startTime.value.slice(0, 5) != startTime.dataset.oldTime) {
            params.time = startTime.value.slice(0, 5);
        }
        if (duration.value != duration.dataset.oldDuration) {
            params.duration = duration.value;
        }
        if (numberOfPeople.value != numberOfPeople.dataset.oldPersons) {
            params.persons = numberOfPeople.value;
        }
        if (Number(option1.checked) != option1.dataset.oldOption1) {
            params.optionFirst = Number(option1.checked);
        }
        if (Number(option2.checked) != option2.dataset.oldOption2) {
            params.optionSecond = Number(option2.checked);
        }
        if (totalCost.value.split(' ')[0] != totalCost.dataset.oldTotalCost) {
            params.price = totalCost.value.split(' ')[0];
        }
        let idRequest = modalWindow.querySelector('#id-request-edit').innerHTML;
        data = await dataExchangeWithTheServer('put', 'orders', params,
            idRequest);
        form.reset();
        // первоначальная загрузка доступных маршрутов и селектора
        generateAvailableRequest(1, PER_PAGE);
        if (data.id != undefined) {
            let text = `Заявка успешно отредактирована! :)`;
            showAlert('success', text);
        } else {
            let text = `При редактировании заявки возникла ошибка! :(<br>\
                    Пожалуйста, попробуйте еще раз или зайдите позже.`;
            showAlert('danger', text);
        }
    } else {
        let text = 'Заявка не может быть создана :(<br>\
                Пожалуйста, заполните все необходимые поля.';
        showAlert('warning', text);
    }
}

/**
 * Функция, предназначенная для отображения гидов по выбранному маршруту
 * @param {object} data - массив, содержащий ифнормацию о гидах 
 */
function renderGuides(data) {
    // очистка прошлых данных о гидах
    tableGuides.innerHTML = '';
    // формирование шапки таблицы путем клонирования шаблона
    let itemGuides =
        tempGuides.content.firstElementChild.cloneNode(true);
    // добавление шапки таблицы в таблицу
    tableGuides.append(itemGuides);
    // перебор и вывод строк таблицы
    for (let i = 0; i < data.length; i++) {
        // формирование элемента путем клонирования шаблона
        itemGuides =
            tempGuides.content.firstElementChild.cloneNode(true);
        // назначение скрытого идентификатора
        // используется для поиска информации по гиду
        itemGuides.dataset.idGuide =
            data[i]['id'];
        // добавление иконки
        let imgGuide = document.createElement('img');
        imgGuide.src = 'static/files/guide-icon-1.png';
        imgGuide.classList.add('icon-64');
        let divImg = document.createElement('div');
        divImg.classList.add('white-square-with-rounded-edges');
        divImg.append(imgGuide);
        itemGuides.querySelector('.img').innerHTML = '';
        itemGuides.querySelector('.img').append(divImg);
        // добавление ФИО гида
        itemGuides.querySelector('.name').innerHTML =
            data[i]['name'];
        // добавление языков, которыми владеет гид
        if (data[i]['language'].includes(' ')) {
            let newData = data[i]['language'].split(' ');
            let langContainer = document.createElement('div');
            langContainer.classList.add('lang-container');
            for (let j = 0; j < newData.length; j++) {
                let langItem = document.createElement('div');
                langItem.classList.add('lang-item');
                langItem.innerHTML = newData[j];
                langContainer.append(langItem);
            }
            itemGuides.querySelector('.lang').innerHTML = '';
            itemGuides.querySelector('.lang').append(langContainer);
        } else {
            itemGuides.querySelector('.lang').innerHTML =
                data[i]['language'];
        }

        // добавление опыта работы
        itemGuides.querySelector('.exp').innerHTML =
            data[i]['workExperience'];
        // добавление стоимости услуг гида
        itemGuides.querySelector('.price').innerHTML =
            data[i]['pricePerHour'];
        // выбор области кнопки для выбора гида
        let choose = itemGuides.querySelector('.choose');
        // назначение стилей
        // удаление стандартного стиля
        choose.classList.remove('choose');
        // назначение стиля кнопки
        choose.classList.add('choose-btn');
        // отображение display: flex
        choose.classList.add('d-flex');
        // выравнивание
        choose.classList.add('justify-content-center');
        choose.classList.add('align-items-center');
        // создание элемента кнопки, при помощи которой выбирается маршрут
        let button = document.createElement('button');
        // добавление ссылки стилей кнопки
        button.classList.add('button');
        // добавление атрибутов для работы с модальным окном
        button.dataset.bsToggle = 'modal';
        button.dataset.bsTarget = '#createRequest';
        // добавление содержания кнопке
        button.innerHTML = 'Выбрать';
        // назначение обработчика на кнопку 
        button.onclick = buttonChooseGuideHandler;
        // зачистка 
        choose.innerHTML = '';
        // добавление кнопки
        choose.append(button);
        // добавление строки таблицы в таблицу
        tableGuides.append(itemGuides);
    }
}

/**
 * Функция, для обработки полученной информации о гидах
 * @param {object} data - сырой массив, содержащий информацию о гидах
 */
function generateGuides(data) {
    renderGuides(data);
}

/**
 * Функция для обработки выбора маршрута (нажатия кнопки "выбрать")
 * @param {object} event - событие
 */
async function buttonChooseRouteHandler(event) {
    let row = event.target.closest('.row');
    let idRoute = row.dataset.idRoute;
    let data = await dataExchangeWithTheServer('get', 'routes', {}, idRoute);
    let nameRoute = '"' + row.querySelector('.name').innerHTML + '"';
    document.querySelector('.guides-name-of-route').innerHTML = nameRoute;
    generateGuides(data);
}


/**
 * Функция для обработки изменения значения селектора достопримечательностей
 * @param {object} event - событие
 */
function selectorOfAvailableRoutesHandler(event) {
    generateAvailableRequest(1, PER_PAGE,);
}

/**
 * Функция-обработчик для кнопок навигации по странице
 * @param {object} event - событие 
 */
function pageBtnHandler(event) {
    // если нажата не клавиша навигации, то обработчик прекращает работу
    if (!event.target.classList.contains('page-link')) return;
    // если клавиша неактивна, то обработчик прекращает работу
    if (event.target.classList.contains('disabled')) return;
    // иначе, обработчик подгружает данные по нужной странице
    generateAvailableRequest(event.target.dataset.page,
        PER_PAGE,
    );
}

/**
 * Функция-обработчик для поля поиска
 * @param {object} event - событие 
 */
async function searchFieldHandler(event) {
    generateAvailableRequest(1,
        PER_PAGE,
        event.target.value);
}

async function deleteRequestHandler(event) {
    let id = event.target.closest('.modal').querySelector('#request-id').value;
    let response = await dataExchangeWithTheServer('delete', 'orders', {}, id);
    if (response.id == id) {
        let text = `Заявка № ${id} успешно удалена.`;
        showAlert('success', text);
    } else {
        let text = `При удалении заявки возникла ошибка! :(<br>\
            Пожалуйста, попробуйте еще раз или зайдите в личный кабинет позже.`;
        showAlert('danger', text);
    }
    generateAvailableRequest(1, PER_PAGE);
}

window.onload = function () {
    // первоначальная загрузка доступных маршрутов и селектора
    generateAvailableRequest(1, PER_PAGE);
    // назначение обрабтчика на нажатие по панели навигации
    document.querySelector('.pagination-bar').onclick = pageBtnHandler;
    // назначение обработчика на изменение селектора достопримечательностей
    buttonCreateRequest.onclick = buttonSendRequestHandler;
    // получение полей формы модального окна,
    // у которых необходимо отслеживать изменения
    document.querySelector('#excursion-date').onchange =
        changeFieldRequestHandler;
    document.querySelector('#start-time').onchange =
        changeFieldRequestHandler;
    document.querySelector('#duration').onchange =
        changeFieldRequestHandler;
    document.querySelector('#number-of-people').onchange =
        changeFieldRequestHandler;
    document.querySelector('#option-1').onchange =
        changeFieldRequestHandler;
    document.querySelector('#option-2').onchange =
        changeFieldRequestHandler;
    // назначение обработчика на кнопку "отмена" у модального окна
    document.querySelector('#buttonCancel').onclick = function () {
        // удаление старых уведомлений
        if (alertContainer.querySelector('.alert-item')) {
            alertContainer.querySelector('.alert-item').remove();
        };
    };
    // назначение обработчика на кнопку удаления заявки
    delRequestBtn.onclick = deleteRequestHandler;
};
