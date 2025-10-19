import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, CheckCircle, Play } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { saveDraft } from '../../utils/surveyDraft';

interface TemplateQuestion {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  hasOtherOption?: boolean;
}

interface SurveyTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  questions: number;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  popularity: number;
  color: string;
  fullDescription: string;
  useCases: string[];
  questionsData: TemplateQuestion[];
  settings: {
    title: string;
    description: string;
    allowAnonymous: boolean;
    showProgress: boolean;
    randomizeQuestions: boolean;
    oneResponsePerUser: boolean;
    hideCreator: boolean;
  };
}

const templates: SurveyTemplate[] = [
  {
    id: 'customer-satisfaction',
    title: 'Удовлетворенность клиентов',
    description: 'Оцените качество обслуживания, продукта или сервиса. Получите обратную связь от ваших клиентов.',
    category: 'Бизнес',
    icon: '💼',
    questions: 8,
    estimatedTime: '3-5 мин',
    difficulty: 'easy',
    popularity: 95,
    color: '#4CAF50',
    fullDescription: 'Этот шаблон поможет вам собрать детальную обратную связь от клиентов о качестве вашего продукта или сервиса. Включает вопросы о общем удовлетворении, конкретных аспектах обслуживания и рекомендациях по улучшению.',
    useCases: [
      'Оценка качества продукта после покупки',
      'Анализ эффективности клиентского сервиса',
      'Сбор отзывов о новом товаре или услуге',
      'Мониторинг удовлетворенности постоянных клиентов'
    ],
    questionsData: [
      {
        id: 'q1',
        type: 'rating',
        title: 'Как бы вы оценили общее качество нашего продукта/услуги?',
        description: 'Оцените по 5-балльной шкале, где 1 — очень плохо, 5 — отлично',
        required: true
      },
      {
        id: 'q2',
        type: 'single_choice',
        title: 'Как часто вы пользуетесь нашими услугами?',
        required: true,
        options: ['Ежедневно', 'Несколько раз в неделю', 'Раз в неделю', 'Раз в месяц', 'Реже']
      },
      {
        id: 'q3',
        type: 'scale',
        title: 'Насколько вы довольны скоростью обслуживания?',
        description: 'Оцените от 1 до 10, где 1 — очень медленно, 10 — очень быстро',
        required: true,
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Очень медленно', max: 'Очень быстро' }
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        title: 'Что вам больше всего нравится в нашем сервисе?',
        description: 'Выберите все подходящие варианты',
        required: false,
        options: ['Качество продукта', 'Скорость доставки', 'Цены', 'Сервис поддержки', 'Удобство заказа', 'Ассортимент'],
        hasOtherOption: true
      },
      {
        id: 'q5',
        type: 'textarea',
        title: 'Что бы вы хотели улучшить в нашем сервисе?',
        description: 'Ваши предложения помогут нам стать лучше. Опишите конкретные аспекты, которые можно улучшить',
        required: false
      },
      {
        id: 'q6',
        type: 'boolean',
        title: 'Рекомендовали бы вы нас своим друзьям?',
        required: true
      },
      {
        id: 'q7',
        type: 'single_choice',
        title: 'Как вы узнали о нашем сервисе?',
        required: false,
        options: ['Социальные сети', 'Поиск в интернете', 'Рекомендации друзей', 'Реклама', 'Другое']
      },
      {
        id: 'q8',
        type: 'textarea',
        title: 'Дополнительные комментарии или предложения',
        required: false
      }
    ],
    settings: {
      title: 'Оценка удовлетворенности клиентов',
      description: 'Помогите нам улучшить качество обслуживания, поделившись своим мнением',
      allowAnonymous: true,
      showProgress: true,
      randomizeQuestions: false,
      oneResponsePerUser: true,
      hideCreator: false
    }
  },
  {
    id: 'employee-feedback',
    title: 'Обратная связь сотрудников',
    description: 'Узнайте мнение команды о рабочем процессе, условиях труда и атмосфере в компании.',
    category: 'HR',
    icon: '👥',
    questions: 12,
    estimatedTime: '5-7 мин',
    difficulty: 'medium',
    popularity: 88,
    color: '#2196F3',
    fullDescription: 'Этот шаблон предназначен для сбора обратной связи от сотрудников о различных аспектах работы в компании. Помогает выявить проблемы и улучшить рабочую атмосферу.',
    useCases: [
      'Ежеквартальная оценка рабочей атмосферы',
      'Анализ удовлетворенности после изменений в компании',
      'Сбор мнений о новых политиках или процедурах',
      'Оценка эффективности руководства'
    ],
    questionsData: [
      {
        id: 'q1',
        type: 'rating',
        title: 'Как бы вы оценили общую атмосферу в команде?',
        required: true
      },
      {
        id: 'q2',
        type: 'scale',
        title: 'Насколько вы удовлетворены своей текущей ролью?',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Полностью неудовлетворен', max: 'Полностью удовлетворен' },
        required: true
      },
      {
        id: 'q3',
        type: 'single_choice',
        title: 'Как часто вы чувствуете поддержку от руководства?',
        required: true,
        options: ['Всегда', 'Часто', 'Иногда', 'Редко', 'Никогда']
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        title: 'Какие аспекты работы вас больше всего мотивируют?',
        required: false,
        options: ['Зарплата и бонусы', 'Карьерные возможности', 'Интересные задачи', 'Команда', 'Гибкий график', 'Обучение и развитие'],
        hasOtherOption: true
      },
      {
        id: 'q5',
        type: 'boolean',
        title: 'Чувствуете ли вы, что ваше мнение учитывается при принятии решений?',
        required: true
      },
      {
        id: 'q6',
        type: 'scale',
        title: 'Оцените баланс между работой и личной жизнью',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Полностью нарушен', max: 'Идеальный баланс' },
        required: true
      },
      {
        id: 'q7',
        type: 'single_choice',
        title: 'Как часто вы получаете обратную связь о своей работе?',
        required: true,
        options: ['Еженедельно', 'Ежемесячно', 'Ежеквартально', 'Раз в полгода', 'Редко или никогда']
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        title: 'Что бы вы хотели улучшить в рабочем процессе?',
        required: false,
        options: ['Коммуникацию', 'Инструменты и технологии', 'Процессы', 'Обучение', 'Признание достижений'],
        hasOtherOption: true
      },
      {
        id: 'q9',
        type: 'textarea',
        title: 'Какие у вас есть предложения по улучшению работы команды?',
        required: false
      },
      {
        id: 'q10',
        type: 'boolean',
        title: 'Рекомендовали бы вы нашу компанию как место работы?',
        required: true
      },
      {
        id: 'q11',
        type: 'single_choice',
        title: 'Как вы оцениваете возможности для профессионального роста?',
        required: true,
        options: ['Отличные', 'Хорошие', 'Удовлетворительные', 'Плохие', 'Очень плохие']
      },
      {
        id: 'q12',
        type: 'textarea',
        title: 'Дополнительные комментарии или предложения',
        required: false
      }
    ],
    settings: {
      title: 'Обратная связь сотрудников',
      description: 'Ваше мнение важно для нас. Помогите улучшить рабочую атмосферу в компании',
      allowAnonymous: true,
      showProgress: true,
      randomizeQuestions: false,
      oneResponsePerUser: true,
      hideCreator: false
    }
  },
  {
    id: 'market-research',
    title: 'Маркетинговое исследование',
    description: 'Изучите предпочтения потребителей, узнайте о новых трендах и потребностях рынка.',
    category: 'Маркетинг',
    icon: '📊',
    questions: 15,
    estimatedTime: '8-10 мин',
    difficulty: 'hard',
    popularity: 92,
    color: '#FF9800',
    fullDescription: 'Этот шаблон поможет провести комплексное маркетинговое исследование для понимания целевой аудитории, их потребностей и предпочтений.',
    useCases: [
      'Исследование новых рынков',
      'Анализ конкурентной среды',
      'Изучение потребительских предпочтений',
      'Планирование продуктовой стратегии'
    ],
    questionsData: [
      {
        id: 'q1',
        type: 'single_choice',
        title: 'Какой у вас возраст?',
        description: 'Эта информация поможет нам лучше понять нашу аудиторию',
        required: true,
        options: ['18-24 года', '25-34 года', '35-44 года', '45-54 года', '55+ лет']
      },
      {
        id: 'q2',
        type: 'single_choice',
        title: 'Какой у вас уровень дохода?',
        description: 'Укажите примерный месячный доход',
        required: false,
        options: ['До 30,000 руб', '30,000-50,000 руб', '50,000-80,000 руб', '80,000-120,000 руб', 'Свыше 120,000 руб', 'Предпочитаю не указывать']
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        title: 'Какие товары/услуги вас интересуют?',
        description: 'Выберите все подходящие категории',
        required: true,
        options: ['Электроника', 'Одежда и обувь', 'Красота и здоровье', 'Дом и сад', 'Спорт и отдых', 'Автомобили', 'Образование', 'Финансовые услуги'],
        hasOtherOption: true
      },
      {
        id: 'q4',
        type: 'single_choice',
        title: 'Как часто вы совершаете покупки онлайн?',
        required: true,
        options: ['Ежедневно', 'Несколько раз в неделю', 'Раз в неделю', 'Раз в месяц', 'Реже']
      },
      {
        id: 'q5',
        type: 'scale',
        title: 'Насколько важна для вас цена при выборе товара?',
        description: 'Оцените от 1 до 10, где 1 — не важна, 10 — очень важна',
        required: true,
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Не важна', max: 'Очень важна' }
      },
      {
        id: 'q6',
        type: 'scale',
        title: 'Насколько важно для вас качество товара?',
        description: 'Оцените от 1 до 10, где 1 — не важно, 10 — очень важно',
        required: true,
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Не важно', max: 'Очень важно' }
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        title: 'Что влияет на ваш выбор при покупке?',
        description: 'Выберите все важные факторы',
        required: true,
        options: ['Цена', 'Качество', 'Бренд', 'Отзывы других покупателей', 'Реклама', 'Рекомендации друзей', 'Удобство покупки', 'Доставка'],
        hasOtherOption: true
      },
      {
        id: 'q8',
        type: 'single_choice',
        title: 'Где вы обычно ищете информацию о товарах?',
        required: true,
        options: ['Поисковые системы (Google, Yandex)', 'Социальные сети', 'Сайты магазинов', 'Отзывы и форумы', 'Реклама', 'Рекомендации знакомых']
      },
      {
        id: 'q9',
        type: 'boolean',
        title: 'Покупаете ли вы товары по рекомендациям блогеров?',
        required: true
      },
      {
        id: 'q10',
        type: 'textarea',
        title: 'Какие проблемы вы чаще всего испытываете при покупке товаров?',
        description: 'Опишите основные сложности, с которыми сталкиваетесь',
        required: false
      },
      {
        id: 'q11',
        type: 'single_choice',
        title: 'Какой способ доставки предпочитаете?',
        required: true,
        options: ['Курьерская доставка', 'Пункты выдачи', 'Почта России', 'Самовывоз', 'Не важно']
      },
      {
        id: 'q12',
        type: 'scale',
        title: 'Насколько важна для вас экологичность товаров?',
        description: 'Оцените от 1 до 10, где 1 — не важна, 10 — очень важна',
        required: true,
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Не важна', max: 'Очень важна' }
      },
      {
        id: 'q13',
        type: 'multiple_choice',
        title: 'Какие социальные сети вы используете?',
        description: 'Выберите все подходящие варианты',
        required: false,
        options: ['ВКонтакте', 'Instagram', 'Telegram', 'YouTube', 'TikTok', 'Facebook', 'Одноклассники', 'Не использую'],
        hasOtherOption: true
      },
      {
        id: 'q14',
        type: 'textarea',
        title: 'Какие новые товары или услуги вы хотели бы видеть на рынке?',
        description: 'Опишите ваши пожелания и потребности',
        required: false
      },
      {
        id: 'q15',
        type: 'textarea',
        title: 'Дополнительные комментарии',
        description: 'Поделитесь любыми дополнительными мыслями',
        required: false
      }
    ],
    settings: {
      title: 'Маркетинговое исследование',
      description: 'Помогите нам лучше понять потребности рынка и создать продукты, которые вам действительно нужны',
      allowAnonymous: true,
      showProgress: true,
      randomizeQuestions: false,
      oneResponsePerUser: true,
      hideCreator: false
    }
  },
  {
    id: 'event-feedback',
    title: 'Оценка мероприятия',
    description: 'Соберите отзывы участников о проведенном событии, организации и содержании.',
    category: 'События',
    icon: '🎉',
    questions: 6,
    estimatedTime: '2-3 мин',
    difficulty: 'easy',
    popularity: 85,
    color: '#E91E63',
    fullDescription: 'Этот шаблон поможет собрать обратную связь от участников мероприятия для оценки его успешности и планирования будущих событий.',
    useCases: [
      'Оценка корпоративных мероприятий',
      'Анализ конференций и семинаров',
      'Сбор отзывов о вечеринках и праздниках',
      'Оценка образовательных мероприятий'
    ],
    questionsData: [
      {
        id: 'q1',
        type: 'rating',
        title: 'Как бы вы оценили общую организацию мероприятия?',
        description: 'Оцените по 5-балльной шкале',
        required: true
      },
      {
        id: 'q2',
        type: 'scale',
        title: 'Насколько полезным было для вас это мероприятие?',
        description: 'Оцените от 1 до 10, где 1 — совсем не полезно, 10 — очень полезно',
        required: true,
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Не полезно', max: 'Очень полезно' }
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        title: 'Что вам больше всего понравилось?',
        description: 'Выберите все подходящие варианты',
        required: false,
        options: ['Содержание программы', 'Организация', 'Место проведения', 'Питание', 'Общение с участниками', 'Спикеры'],
        hasOtherOption: true
      },
      {
        id: 'q4',
        type: 'single_choice',
        title: 'Рекомендовали бы вы это мероприятие другим?',
        required: true,
        options: ['Определенно да', 'Скорее да', 'Затрудняюсь ответить', 'Скорее нет', 'Определенно нет']
      },
      {
        id: 'q5',
        type: 'textarea',
        title: 'Что можно улучшить в следующий раз?',
        description: 'Ваши предложения помогут сделать будущие мероприятия лучше',
        required: false
      },
      {
        id: 'q6',
        type: 'textarea',
        title: 'Дополнительные комментарии',
        description: 'Поделитесь любыми дополнительными мыслями о мероприятии',
        required: false
      }
    ],
    settings: {
      title: 'Оценка мероприятия',
      description: 'Ваше мнение важно для нас. Помогите улучшить качество будущих мероприятий',
      allowAnonymous: true,
      showProgress: true,
      randomizeQuestions: false,
      oneResponsePerUser: true,
      hideCreator: false
    }
  },
  {
    id: 'product-feedback',
    title: 'Отзыв о продукте',
    description: 'Получите детальную оценку вашего товара или услуги от покупателей.',
    category: 'Продукт',
    icon: '🛍️',
    questions: 10,
    estimatedTime: '4-6 мин',
    difficulty: 'medium',
    popularity: 90,
    color: '#9C27B0',
    fullDescription: 'Этот шаблон поможет собрать детальную обратную связь о вашем продукте или услуге для улучшения качества и повышения удовлетворенности клиентов.',
    useCases: [
      'Оценка нового продукта',
      'Анализ качества товара',
      'Сбор отзывов о услуге',
      'Исследование пользовательского опыта'
    ],
    questionsData: [
      {
        id: 'q1',
        type: 'rating',
        title: 'Как бы вы оценили качество продукта?',
        description: 'Оцените по 5-балльной шкале',
        required: true
      },
      {
        id: 'q2',
        type: 'single_choice',
        title: 'Как долго вы пользуетесь этим продуктом?',
        required: true,
        options: ['Менее недели', '1-4 недели', '1-3 месяца', '3-6 месяцев', 'Более 6 месяцев']
      },
      {
        id: 'q3',
        type: 'scale',
        title: 'Насколько продукт соответствует вашим ожиданиям?',
        description: 'Оцените от 1 до 10, где 1 — совсем не соответствует, 10 — полностью соответствует',
        required: true,
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Не соответствует', max: 'Полностью соответствует' }
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        title: 'Какие аспекты продукта вам нравятся?',
        description: 'Выберите все подходящие варианты',
        required: false,
        options: ['Качество', 'Дизайн', 'Функциональность', 'Цена', 'Удобство использования', 'Надежность', 'Скорость работы'],
        hasOtherOption: true
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        title: 'Что можно улучшить в продукте?',
        description: 'Выберите все аспекты, которые требуют улучшения',
        required: false,
        options: ['Качество', 'Дизайн', 'Функциональность', 'Цена', 'Удобство использования', 'Надежность', 'Скорость работы'],
        hasOtherOption: true
      },
      {
        id: 'q6',
        type: 'single_choice',
        title: 'Как часто вы сталкиваетесь с проблемами при использовании?',
        required: true,
        options: ['Никогда', 'Очень редко', 'Иногда', 'Часто', 'Постоянно']
      },
      {
        id: 'q7',
        type: 'boolean',
        title: 'Рекомендовали бы вы этот продукт друзьям?',
        required: true
      },
      {
        id: 'q8',
        type: 'single_choice',
        title: 'Как вы узнали о продукте?',
        required: false,
        options: ['Реклама', 'Социальные сети', 'Рекомендации друзей', 'Поиск в интернете', 'Магазин', 'Другое']
      },
      {
        id: 'q9',
        type: 'textarea',
        title: 'Опишите ваш опыт использования продукта',
        description: 'Поделитесь подробностями о том, как вы используете продукт и какие у вас впечатления',
        required: false
      },
      {
        id: 'q10',
        type: 'textarea',
        title: 'Дополнительные предложения',
        description: 'Есть ли у вас идеи по улучшению продукта?',
        required: false
      }
    ],
    settings: {
      title: 'Отзыв о продукте',
      description: 'Ваше мнение поможет нам улучшить продукт и сделать его еще лучше',
      allowAnonymous: true,
      showProgress: true,
      randomizeQuestions: false,
      oneResponsePerUser: true,
      hideCreator: false
    }
  },
  {
    id: 'education-assessment',
    title: 'Оценка обучения',
    description: 'Проанализируйте эффективность образовательного процесса и качество преподавания.',
    category: 'Образование',
    icon: '🎓',
    questions: 9,
    estimatedTime: '3-4 мин',
    difficulty: 'easy',
    popularity: 82,
    color: '#607D8B',
    fullDescription: 'Этот шаблон поможет оценить качество образовательного процесса, эффективность преподавания и общую удовлетворенность обучением.',
    useCases: [
      'Оценка курсов и тренингов',
      'Анализ качества преподавания',
      'Сбор отзывов о образовательных программах',
      'Оценка онлайн-обучения'
    ],
    questionsData: [
      {
        id: 'q1',
        type: 'rating',
        title: 'Как бы вы оценили качество обучения?',
        description: 'Оцените по 5-балльной шкале',
        required: true
      },
      {
        id: 'q2',
        type: 'scale',
        title: 'Насколько полезными были полученные знания?',
        description: 'Оцените от 1 до 10, где 1 — совсем не полезны, 10 — очень полезны',
        required: true,
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Не полезны', max: 'Очень полезны' }
      },
      {
        id: 'q3',
        type: 'single_choice',
        title: 'Как вы оцениваете уровень преподавателя?',
        required: true,
        options: ['Отличный', 'Хороший', 'Удовлетворительный', 'Плохой', 'Очень плохой']
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        title: 'Что вам больше всего понравилось в обучении?',
        description: 'Выберите все подходящие варианты',
        required: false,
        options: ['Содержание программы', 'Методы преподавания', 'Практические задания', 'Общение с преподавателем', 'Групповая работа', 'Материалы'],
        hasOtherOption: true
      },
      {
        id: 'q5',
        type: 'single_choice',
        title: 'Была ли программа обучения слишком сложной?',
        required: true,
        options: ['Слишком простая', 'Подходящая сложность', 'Слегка сложная', 'Очень сложная']
      },
      {
        id: 'q6',
        type: 'scale',
        title: 'Насколько хорошо была организована программа?',
        description: 'Оцените от 1 до 10, где 1 — плохо организована, 10 — отлично организована',
        required: true,
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Плохо', max: 'Отлично' }
      },
      {
        id: 'q7',
        type: 'boolean',
        title: 'Рекомендовали бы вы эту программу другим?',
        required: true
      },
      {
        id: 'q8',
        type: 'textarea',
        title: 'Что можно улучшить в программе обучения?',
        description: 'Ваши предложения помогут сделать обучение более эффективным',
        required: false
      },
      {
        id: 'q9',
        type: 'textarea',
        title: 'Дополнительные комментарии',
        description: 'Поделитесь любыми дополнительными мыслями об обучении',
        required: false
      }
    ],
    settings: {
      title: 'Оценка обучения',
      description: 'Ваше мнение поможет улучшить качество образовательного процесса',
      allowAnonymous: true,
      showProgress: true,
      randomizeQuestions: false,
      oneResponsePerUser: true,
      hideCreator: false
    }
  },
  {
    id: 'health-survey',
    title: 'Медицинский опрос',
    description: 'Соберите информацию о здоровье, симптомах или качестве медицинского обслуживания.',
    category: 'Здоровье',
    icon: '🏥',
    questions: 7,
    estimatedTime: '3-5 мин',
    difficulty: 'medium',
    popularity: 87,
    color: '#4CAF50',
    fullDescription: 'Этот шаблон поможет собрать информацию о здоровье пациентов, их симптомах и качестве медицинского обслуживания для улучшения медицинских услуг.',
    useCases: [
      'Сбор анамнеза пациентов',
      'Оценка качества медицинских услуг',
      'Исследование симптомов заболеваний',
      'Анализ эффективности лечения'
    ],
    questionsData: [
      {
        id: 'q1',
        type: 'single_choice',
        title: 'Как вы оцениваете свое общее самочувствие?',
        required: true,
        options: ['Отличное', 'Хорошее', 'Удовлетворительное', 'Плохое', 'Очень плохое']
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        title: 'Какие симптомы вас беспокоят?',
        description: 'Выберите все подходящие варианты',
        required: false,
        options: ['Головная боль', 'Усталость', 'Бессонница', 'Боль в спине', 'Проблемы с пищеварением', 'Стресс', 'Тревожность'],
        hasOtherOption: true
      },
      {
        id: 'q3',
        type: 'single_choice',
        title: 'Как часто вы обращаетесь к врачу?',
        required: true,
        options: ['Раз в год', 'Раз в полгода', 'Раз в 3 месяца', 'Ежемесячно', 'По необходимости']
      },
      {
        id: 'q4',
        type: 'rating',
        title: 'Как бы вы оценили качество медицинского обслуживания?',
        description: 'Оцените по 5-балльной шкале',
        required: true
      },
      {
        id: 'q5',
        type: 'scale',
        title: 'Насколько вы довольны временем ожидания приема?',
        description: 'Оцените от 1 до 10, где 1 — очень долго, 10 — очень быстро',
        required: true,
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Очень долго', max: 'Очень быстро' }
      },
      {
        id: 'q6',
        type: 'boolean',
        title: 'Рекомендовали бы вы эту клинику другим?',
        required: true
      },
      {
        id: 'q7',
        type: 'textarea',
        title: 'Дополнительные комментарии о здоровье',
        description: 'Поделитесь любой дополнительной информацией о своем здоровье',
        required: false
      }
    ],
    settings: {
      title: 'Медицинский опрос',
      description: 'Ваша информация поможет улучшить качество медицинского обслуживания',
      allowAnonymous: true,
      showProgress: true,
      randomizeQuestions: false,
      oneResponsePerUser: true,
      hideCreator: false
    }
  }
];

const TemplateDetailPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/templates'
  });

  // Скролл к верху при загрузке страницы
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [templateId]);

  const template = templates.find(t => t.id === templateId);

  if (!template) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--tg-bg-color)',
        color: 'var(--tg-text-color)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
          Шаблон не найден
        </h1>
        <button
          onClick={() => navigate('/templates')}
          style={{
            backgroundColor: 'var(--tg-button-color)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Вернуться к шаблонам
        </button>
      </div>
    );
  }

  const handleUseTemplate = () => {
    hapticFeedback?.success();
    
    // Сохраняем данные шаблона в localStorage
    saveDraft({
      mode: 'manual',
      settings: {
        title: template.settings.title,
        description: template.settings.description,
        language: 'ru',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        maxParticipants: '',
        allowAnonymous: template.settings.allowAnonymous,
        showProgress: template.settings.showProgress,
        randomizeQuestions: template.settings.randomizeQuestions,
        oneResponsePerUser: template.settings.oneResponsePerUser,
        collectTelegramData: false,
        hideCreator: template.settings.hideCreator,
        creationType: 'manual',
        motivationEnabled: false,
        motivationType: 'discount',
        motivationDetails: '',
        motivationConditions: ''
      },
      questions: template.questionsData,
      updatedAt: Date.now()
    });

    // Переходим на страницу создания опроса (прямо к SurveyCreatorPage)
    navigate('/survey/create/manual');
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Легкий';
      case 'medium': return 'Средний';
      case 'hard': return 'Сложный';
      default: return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return 'var(--tg-hint-color)';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      paddingBottom: '100px'
    }}>
      {/* Шапка */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid var(--tg-section-separator-color)',
        backgroundColor: 'var(--tg-bg-color)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: template.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            {template.icon}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: '0 0 4px 0',
              color: 'var(--tg-text-color)'
            }}>
              {template.title}
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)',
              margin: 0
            }}>
              {template.category}
            </p>
          </div>
        </div>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: 0,
          color: 'var(--tg-text-color)'
        }}>
          {template.description}
        </p>
      </div>

      {/* Основная информация */}
      <div style={{ padding: '20px 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'var(--tg-text-color)',
              marginBottom: '4px'
            }}>
              {template.questions}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--tg-hint-color)'
            }}>
              вопросов
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'var(--tg-text-color)',
              marginBottom: '4px'
            }}>
              {template.estimatedTime}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--tg-hint-color)'
            }}>
              время
            </div>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <div style={{
            flex: 1,
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: getDifficultyColor(template.difficulty)
            }} />
            <span style={{
              fontSize: '14px',
              color: 'var(--tg-text-color)'
            }}>
              {getDifficultyText(template.difficulty)}
            </span>
          </div>

          <div style={{
            flex: 1,
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Star size={16} color="var(--tg-hint-color)" />
            <span style={{
              fontSize: '14px',
              color: 'var(--tg-text-color)'
            }}>
              {template.popularity}% популярность
            </span>
          </div>
        </div>

        {/* Подробное описание */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            color: 'var(--tg-text-color)'
          }}>
            О шаблоне
          </h3>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.5',
            color: 'var(--tg-text-color)',
            margin: 0
          }}>
            {template.fullDescription}
          </p>
        </div>

        {/* Случаи использования */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            color: 'var(--tg-text-color)'
          }}>
            Когда использовать
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {template.useCases.map((useCase, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '8px 0'
              }}>
                <CheckCircle size={16} color="var(--tg-button-color)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{
                  fontSize: '14px',
                  color: 'var(--tg-text-color)',
                  lineHeight: '1.4'
                }}>
                  {useCase}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Предварительный просмотр вопросов */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            color: 'var(--tg-text-color)'
          }}>
            Вопросы в шаблоне
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {template.questionsData.slice(0, 3).map((question, index) => (
              <div key={question.id} style={{
                backgroundColor: 'var(--tg-section-bg-color)',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid var(--tg-section-separator-color)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: 'var(--tg-hint-color)'
                  }}>
                    {index + 1}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--tg-hint-color)',
                    textTransform: 'uppercase'
                  }}>
                    {question.type === 'rating' ? 'Оценка' :
                     question.type === 'single_choice' ? 'Выбор' :
                     question.type === 'multiple_choice' ? 'Множественный выбор' :
                     question.type === 'scale' ? 'Шкала' :
                     question.type === 'textarea' ? 'Текст' :
                     question.type === 'boolean' ? 'Да/Нет' : question.type}
                  </span>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--tg-text-color)',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {question.title}
                </p>
              </div>
            ))}
            {template.questionsData.length > 3 && (
              <div style={{
                textAlign: 'center',
                padding: '8px',
                color: 'var(--tg-hint-color)',
                fontSize: '14px'
              }}>
                и еще {template.questionsData.length - 3} вопросов...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Кнопка использования шаблона */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        backgroundColor: 'var(--tg-bg-color)',
        borderTop: '1px solid var(--tg-section-separator-color)'
      }}>
        <button
          onClick={handleUseTemplate}
          style={{
            width: '100%',
            backgroundColor: 'var(--tg-button-color)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Play size={20} />
          Использовать шаблон
        </button>
      </div>
    </div>
  );
};

export default TemplateDetailPage;
