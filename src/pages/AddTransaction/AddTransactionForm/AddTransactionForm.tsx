import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsArrowLeft } from 'react-icons/bs';
import { handleCreateDocFunction, handleFetchRecentTransactions, handleFetchTransactionsMonth, handleUpdateDocFunction } from 'assets/functions/handleDatabaseFunctions';
import { ICategory, ITransaction, ITransactionType } from 'assets/interfaces/interfaces';
import { useCurrentTransaction } from 'assets/state/hooks/addTransactionHooks';
import { useAccounts, useCategories, useChosenMonth, useRecentTransactions, useTransactionsMonth, useUser } from 'assets/state/hooks/firebaseHooks';
import styles from './AddTransactionForm.module.scss';
import stylesComponents from 'assets/styles/pageComponents.module.scss';
import classNames from 'classnames';


const AddTransactionForm = () => {
  const nav = useNavigate();
  const [user] = useUser();
  const [, setRecentTransactions] = useRecentTransactions();
  const [, setTransactionsMonth] = useTransactionsMonth();
  const [month] = useChosenMonth();
  const [categories] = useCategories();
  const [accounts] = useAccounts();
  const [currentTransaction, setCurrentTransaction] = useCurrentTransaction();
  
  // 👇 form states
  const [name, setName] = useState('');
  const [transactionType, setTransactionType] = useState<ITransactionType | null>(null);
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState((new Date(Date.now() - new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
  const [account, setAccount] = useState('');
  const [notes, setNotes] = useState('');
  // ☝️ form states

  useEffect(() => {
    if (user && currentTransaction) {
      handleCurrentTransactionFormLoad();
    }
  }, [currentTransaction, user]);


  const handleCurrentTransactionFormLoad = () => {
    if (currentTransaction) {
      setName(currentTransaction.description);
      setTransactionType(currentTransaction.type);
      setAmount(currentTransaction.amount);
      //category
      const categoryObj = categories.find(item => (item.value === currentTransaction.category));
      if (categoryObj) setCategory(JSON.stringify(categoryObj));

      setTransactionDate(currentTransaction.date.toISOString().split('T')[0]);
      setAccount(currentTransaction.account);
      setNotes(currentTransaction.note);
    }
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (user) {
      const transaction = getTransactionDoc();
      if (currentTransaction) {
        await handleUpdateDocFunction('transactions', user.uid, { ...transaction, id: currentTransaction.id });
      } else {
        await handleCreateDocFunction('transactions', user.uid, transaction);
      }
      resetForm();
      setCurrentTransaction(null);
      handleReturnButton();
      handleFetchRecentTransactions(user.uid, setRecentTransactions);
      handleFetchTransactionsMonth(user.uid, setTransactionsMonth, month);
    }
  };

  const getTransactionDoc = () => {
    const transaction: ITransaction = {
      description: name,
      type: transactionType as ITransactionType,
      amount: amount,
      category: JSON.parse(category).value,
      date: new Date(transactionDate.replace(/-/g, '/')), //replace '-' per '/' makes the date to be created in the user timezone, instead of UTC
      account: account,
      note: notes,
      publishDate: new Date(),
    };

    return transaction;
  };

  const resetForm = () => {
    setName('');
    setTransactionType(null);
    setAmount(0);
    setCategory('');
    setCategoryDescription('');
    setTransactionDate((new Date(Date.now() - new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
    setAccount('');
    setNotes('');
  };

  const handleReturnButton = () => {
    setCurrentTransaction(null);
    if (window.history.state && window.history.state.idx > 0) {
      nav(-1);
    } else {
      nav('/', { replace: true }); // return to home if there is no back page history
    }
  };

  const handleSelectingCategory = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCategory(value);
    if (value && value.length > 0) {
      const item: ICategory = JSON.parse(e.target.value);
      setCategoryDescription(item.description);
    } else {
      setCategoryDescription('');
    }
  };

  const getFormTitle = () => {
    if (currentTransaction) return 'Update Transaction';
    if (transactionType === 'income') return 'Add a new Income';
    if (transactionType === 'expense') return 'Add a new Expense';
    return 'Add a new Transaction';
  };

  const handleTypeTransactionOptionClick = (type: ITransactionType) => {
    if (type === transactionType) {
      setTransactionType(null);
    } else {
      setTransactionType(type);
    }
    setCategory('');
    setCategoryDescription(''); // to reset the category so the full description does not keep on the screen
  };

  const maskCurrencyNumber = (value: number) => {
    const options = { minimumFractionDigits: 2 };
    const maskedNumber = (new Intl.NumberFormat('en-US', options).format(value)).toLocaleString().replace(/,/g, ' ');

    const currency = transactionType === 'income' ? '+ $'
      : transactionType === 'expense' ? '- $' : '$';

    return currency + ' ' + maskedNumber;
  };

  const unmaskCurrencyNumber = (value: string) => {
    value = value.replace('.', '').replace(',', '').replace(/\D/g, '');
    return parseFloat(value) / 100;
  };

  return (
    <section className={`${stylesComponents.pageComponents} ${styles.addTransactionForm__container}`}>
      <div id='form-header'>
        <BsArrowLeft
          className={styles.addTransactionForm__returnPage}
          role='button'
          onClick={handleReturnButton}
        />
        <h2 className={styles.addTransactionForm__title}>{getFormTitle()}</h2>
      </div>

      <form onSubmit={handleFormSubmit}>
        <label className={styles.addTransactionForm__label}>
          How would you like to call this transaction?
          <input
            className={styles.addTransactionForm__input}
            required
            type="text"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>

        <label htmlFor='transactionamount' className={styles.addTransactionForm__label}> How much was it? </label>
        <div role='select' className={styles.addTransactionForm__typeOptions}>
          <div
            role='option'
            className={classNames({
              [styles.addTransactionForm__typeOption]: true,
              [styles.addTransactionForm__typeOptionSelected]: transactionType === 'income'
            })}
            onClick={() => handleTypeTransactionOptionClick('income')}
          >+ $</div>
          <div
            role='option'
            className={classNames({
              [styles.addTransactionForm__typeOption]: true,
              [styles.addTransactionForm__typeOptionSelected]: transactionType === 'expense'
            })}
            onClick={() => handleTypeTransactionOptionClick('expense')}
          >- $</div>
        </div>
        <input
          id='transactionamount'
          className={`${styles.addTransactionForm__input} ${styles.addTransactionForm__currencyInput}`}
          required
          type="text"
          onChange={(e) => setAmount(unmaskCurrencyNumber(e.target.value))}
          value={maskCurrencyNumber(amount)}
          placeholder='0.00'
        />

        <label className={styles.addTransactionForm__label}> Which category?
          <select
            className={styles.addTransactionForm__input}
            value={category}
            onChange={handleSelectingCategory}
            required
          >
            <option value=""></option>
            {
              categories && categories.length > 0 && transactionType
                ? (
                  categories.map(item => (
                    item.type === transactionType
                      ? (
                        <option value={JSON.stringify(item)} key={item.id}>{item.ordering ? `${item.ordering} - ` : null}{item.value}</option>
                      )
                      : item.type === 'other'
                        ? (
                          <option value={JSON.stringify(item)} key={item.id}> {item.value}</option>
                        )
                        : null
                  ))
                )
                : null
            }
          </select>
        </label>
        <p className={styles.addTransactionForm__categoryDescription}>
          {
            categoryDescription && categoryDescription.length > 0
              ? (
                categoryDescription
              )
              : null
          }
        </p>

        <label className={styles.addTransactionForm__label}>
          <span className={styles.addTransactionForm__labelDateText}>Which date?</span>
          <input
            className={`${styles.addTransactionForm__input} ${styles.addTransactionForm__inputdate}`}
            required
            type="date"
            onChange={(event) => setTransactionDate(event.target.value)}
            value={transactionDate}
          />
        </label>

        <label className={styles.addTransactionForm__label}> Which account?
          <select
            className={styles.addTransactionForm__input}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            required
          >
            <option value=""></option>
            {
              accounts && accounts.length > 0
                ? (
                  accounts.map(item => (
                    <option value={item.name} key={item.id}>{item.name}</option>
                  ))
                )
                : null
            }
          </select>
        </label>

        <label className={styles.addTransactionForm__label}> Notes:
          <textarea
            className={styles.addTransactionForm__notes}
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
            placeholder='(optional) take any notes you may find useful about this transaction.'
          />
        </label>

        <button className={styles.addTransactionForm__button} type='submit'>
          {
            currentTransaction
              ? ('Update Transaction')
              : transactionType === 'income' ? 'Add Income'
                : transactionType === 'expense' ? 'Add Expense' : 'Add Transaction'
          }
        </button>
      </form>
    </section>
  );
};

export default AddTransactionForm;