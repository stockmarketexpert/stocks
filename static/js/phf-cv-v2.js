window.phv = false
window.phone_verification_callback = false
function log(...data){
    if(window.debuglog)
        console.log(data)
}

window.invalidPhoneNum = function (form) {
    $(form).find('[type="tel"]').val('');
    $('[name="sms-validation"]').prop("checked", false);
    $('.ph-error').show();
}

function phVerify(number, form){
    if(typeof($) !== 'undefined'){
        if (typeof urlParams == 'undefined') {
          var urlParams = new URLSearchParams(window.location.search);
        }
        log('phverify running');

        if (!number) {
            log('phverify: failed')
            return false;
        }

        number = number.replace(/[^0-9]/g, '');

        //Capture email if any, for tracking litigators
        email = null;
        if(urlParams.get('email')){
          email = urlParams.get('email');
        } else {
          emailFields = form.querySelectorAll('[name="email"]');
          emailFields.forEach((eField) => {
            if(eField.value){
                email = eField.value;
            }
          });
        }
        let url = "https://lp.stockstotrade.com/dncsc/scrub-new.php?ph=" + number;
        if(email){
          url += '&em=' + email;
        }
        // console.log(url);

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'html',
            contentType: 'application/html',
            processData: false,
            data: '',
            success: function (data) {
                // console.log('scrubbed');
                // console.log(data);
                if (data === "Litigator") {
                    window.invalidPhoneNum(form);
                } else {
                    log('phverify: successful')
                    log(data);
                    window.phv = true;
                    window.phone_verification_callback = true;
                    form.dispatchEvent(new Event('submit'));
                }
            },
            error: function (xhr, status, error) {
                log('phverify: failed')
                window.invalidPhoneNum(form);
                log(xhr);
                log(status);
                log(error);
                return false;
            }
        });
    }
    else {
        log('JQuery not defined');
        return false;
    }
}


function formatTel(tf, e) {
    let digits = tf.value.replace(/[^0-9]/g, '');
    // console.log(e.which);
    if (e.which == '8') { //Backspace
      // console.log('backin it up');
        let last = tf.value.charAt(tf.value.length - 1);
        if (isNaN(last) || last == ' ') {
            digits = digits.slice(0, -1);
        }
    }
    if (digits.charAt(0) !== '1') {
        digits = '1' + digits;
    }
    let l = digits.length;
    let ac = digits.substring(1, 4);
    let exc = digits.substring(4, 7);
    let fnl = digits.substring(7, 11);
    let val = '+1 ';
    if (l >= 1) {
        if (l < 4) {
            val += ac;
        } else {
            val += '(' + ac + ') ' + exc;
            if (l > 7) {
                val += '-' + fnl;
            }
        }
    }
    tf.value = val;

}

function checkReq(form) {
    if(typeof($) !== 'undefined'){
        $('.ph-error').hide();
        let phoneField = $(form).find('[type="tel"]');
        if (!phoneField) {
            return false;
        }
        let phone = phoneField.val();
        if (phoneField.attr('required') === 'required' || (phone !== '' && phone)) {
            window.noPhoneReq = false;
            window.phv = false;
            $(form).find('[name="sms-validation"]').attr('required', 'required');
            return true;
        } else {
            if (phoneField.attr('required') !== 'required'){
              window.noPhoneReq = true;
            }
            // console.log('sms box not required');
            $(form).find('[name="sms-validation"]').attr('required', false);
            return false;
        }
    }
    else {
        log("JQuery not defined");
        return false;
    }

    //Checks if phone has a phone field and if so if it is required.  If so, sms field is required

}

document.addEventListener("DOMContentLoaded", e => {
   document.querySelectorAll('form').forEach(function(form){
        form.classList.add('optin_form');
        checkReq(form);
        let name1 = form.querySelector('[name="name"]');
        let name2 = form.querySelector('[name="fname"]');
        let name3 = form.querySelector('[name="firstName"]');
        let email = form.querySelector('[name="email"]');
        let phone = form.querySelector('[type="tel"]');

        let name = name1 || name2 || name3;

        phone.addEventListener('keyup', function(e){checkReq(form); formatTel(this,e);});
        phone.addEventListener('keydown', function(t){checkReq(form); formatTel(this,e);});

        let ph_err = document.createElement('p');
        ph_err.classList.add('ph-error');
        ph_err.setAttribute('style', 'color:#f00;display:none;');
        ph_err.innerText = 'Please enter a valid phone number.';

        phone.parentElement.before(ph_err);
        let chbxs = form.querySelectorAll('.optin_checkbox');
        let chbx = chbxs[0];
        let chbx_lbl = form.querySelector('.optin_checkbox_label');
        let sbmt_agg = form.querySelector('.submit_agreement');

        phone.addEventListener('change', function(e){
            checkReq(form);
            formatTel(this,e);
            chbx.checked = false;
        });

        let optin_type = window.optin_type || 'sms';

        function generateEventData(extra={}){
            let evt_email = email.value
            let nmv = '';
            if(name){
              nmv = name.value;
            }
            let data = {
                ...extra,
                optin_type: optin_type,
                name: nmv,
                phone: phone.value,
                checkbox_agreement: chbx_lbl.textContent,
                checkbox_status: chbx.checked?"checked":"unchecked"
            };

            return {
                email: evt_email,
                data: data
            };
        }

        let event_prefix = window.event_prefix || "";

        let w = STT.WeET;
        if(typeof(w) !== 'undefined'){
          if(chbx){
            chbx.addEventListener('click', function(evt){

                let event = generateEventData();

                if(chbx.checked) {
                    let event_name = event_prefix + 'opt_in.agreement.checked';
                    log("checked");
                    log(event);
                    w.call(event_name, event);
                }
                else {
                    let event_name = event_prefix + 'opt_in.agreement.unchecked';
                    log("unchecked");
                    log(event);
                    w.call(event_name, event);
                }
            });
          }
        }
        else {
            log("WeET is undefined");
        }

        form.addEventListener('submit', function(evt){
          if(window.noPhoneReq){
            return;
          }
            evt.preventDefault();
            if(window.phv && window.phone_verification_callback){
                if (typeof (w) !== 'undefined') {
                    let extra = {
                        'submit_clicked': true
                    }

                    let submit_agreement = "";
                    if(typeof(sbmt_agg) !== 'undefined') {
                        submit_agreement = sbmt_agg.innerText;
                        extra['submit_agreement'] = submit_agreement;
                    }

                    let event = generateEventData(extra);
                    let event_name = event_prefix + 'opt_in.agreement.submitted';
                    log("Submitting SMS Agreement");
                    log(event)
                    w.call(event_name, event);
                } else {
                    log("WeET is undefined - submitting form");
                }
                evt.currentTarget.submit();
            }
            else{
                if(checkReq(this)){
                    if(phVerify(phone.value, this)) {
                        log("Phone validation succeeded");
                    }
                    else {
                        log("Phone validation failed");
                    }
                }
            }
        });
    })
});
