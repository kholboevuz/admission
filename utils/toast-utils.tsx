import { toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

enum ToastType {
    Success = 'success',
    Error = 'error',
    Warning = 'warning',
}

const showToast = (message: string, type: ToastType): void => {
    const options: ToastOptions = {
        position: 'bottom-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'light',
    };

    switch (type) {
        case ToastType.Success:
            toast.success(message, options);
            break;
        case ToastType.Error:
            toast.error(message, options);
            break;
        case ToastType.Warning:
            toast.warn(message, options);
            break;
        default:
            toast(message, options);
    }
};

export { showToast, ToastType };