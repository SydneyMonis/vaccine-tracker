// ==UserScript==
// @name         Cowin Vaccine Tracker
// @version      0.1
// @description  Fetch the Available slots
// @author       Sydney M
// @match        https://www.cowin.gov.in/home
// @grant        none
// ==/UserScript==

window.initializeVaccineTracker = (pinCode, districtId, date, frequency, alertFor18Plus, alertFor45Plus, whichDose = 0, minDoses = 0, $appender, $announcement, onSuccess) => {
    /****************************Variables****************************************************/
    let searchByPinCode = pinCode.length > 0; // If false, it will search by the District ID
    let searchByDistrict = !searchByPinCode;
    if(searchByDistrict && isNaN(parseInt(districtId))) {
    	alert('Please Enter a valid District ID');
    	return;
    }
    
    const today = new Date();
    date = date === 'TODAY' ? `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}` : date;
    const PROTOCOL = 'https://';
    const SUBDOMAIN = 'cdn-api';
    const DOMAIN = 'co-vin.in';
    const API_PREFIX = '/api/v2';
    const BOTH_DOSES = 0;
    const DOSE_1_ONLY = 1;
    const DOSE_2_ONLY = 2;
    let url = searchByPinCode ? `${PROTOCOL}${SUBDOMAIN}.${DOMAIN}${API_PREFIX}/appointment/sessions/public/calendarByPin?pincode=${pinCode}&date=${date}` :
    	`${PROTOCOL}${SUBDOMAIN}.${DOMAIN}${API_PREFIX}/appointment/sessions/public/calendarByDistrict?district_id=${districtId}&date=${date}`;
    clearInterval(window.cron);
    window.cron = null;
    /*******************************Methods*************************************************/

    const fetchData = queryParams => fetch(`${url}?${queryParams}`).then(response => response.json()).catch( err => $appender.prepend('<p>Failed to Access the CoWin API. Make sure you are connected to the internet and are not on any VPN.</p>'));

    const showDataFor18Plus = (data, totalCenters, totalSessions) => {
        if (data.length === 0) {
            let message = `No Available Slots found for Age:18+, Date:${date}, ${searchByPinCode ? `Pincode ${pinCode}`:`District ID ${districtId}`}, checked at ${(new Date()).toLocaleTimeString()}. Checked ${totalCenters} centers having ${totalSessions} sessions.`;
            $appender.prepend('<p>' + message + '</p>');
            console.log(message);
        } else {
            showAlertForAvailableSlots(data);
        }
    }
    const showDataFor45Plus = (data, totalCenters, totalSessions) => {
        if (data.length === 0) {
            let message = `No Available Slots found for Age: 45+, Date: ${date}, ${searchByPinCode ? `Pincode ${pinCode}`:`District ID ${districtId}`} , checked at ${(new Date()).toLocaleTimeString()}. Checked ${totalCenters} centers having ${totalSessions} sessions.`;
            $appender.prepend('<p>' + message + '</p>');
        } else {
            showAlertForAvailableSlots(data);
        }
    }

    const showAlertForAvailableSlots = data => {
        clearInterval(cron);
        appendData(data);
        if(typeof onSuccess === 'function') {
            onSuccess.call();
        }
        $announcement.text('-------------------- The program will stop executing since slots have been found --------------------');
        alert('Available Slots : ' + formatDataToAlert(data));
    }

    const formatDataToAlert = (data, $appender) => {
        let text = ``;
        data.forEach( ({name, vaccine, available_capacity, min_age_limit, pincode}) => {
            text += `
            Name : ${name}, Vaccine: ${vaccine}, Slots Available: ${available_capacity}, Pin Code:${pincode}, Age Group: ${min_age_limit}+`;
        });
        return text;
    }

    const appendData = data => {
        data.forEach( ({name, vaccine, available_capacity, min_age_limit, pincode}) => {
            let text = `Name : ${name}, Vaccine: ${vaccine}, Slots Available: ${available_capacity}, Pincode: ${pincode} Age Group: ${min_age_limit}+`;
            $appender.prepend('<p class="bold">' + text + '</p>')
        });
        $appender.prepend('<b>Congratulations !! Slots found at : </b>');
    }

    const processData = data => {
        let dataFor18Plus = [];
        let dataFor45Plus = [];
        let availableCenters = data.centers;
        let totalCenters = 0;
        let totalSessions = 0;
        if (availableCenters.length === 0) {
            let message = `No Available Centers found for ${searchByPinCode ? `Pincode ${pinCode}`:`District ID ${districtId}`} at ${(new Date()).toLocaleString()}`;
            $appender.prepend('<p>' + message + '</p>');
            console.log(message);
        } else {
            availableCenters.forEach(center => {
            	totalCenters++;
                let sessionsWithAvailableSlots = center.sessions.filter(session => {
                	++totalSessions;
                	if(whichDose === DOSE_1_ONLY) {
                		return session.available_capacity_dose1 > minDoses
                	} else if(whichDose === DOSE_2_ONLY) {
                		return session.available_capacity_dose2 > minDoses
                		
                	}
                	return session.available_capacity > minDoses
                });
                if (sessionsWithAvailableSlots.length > 0) {
                    
                    sessionsWithAvailableSlots.forEach(session => {
                        if (session.min_age_limit === 18) {
                            dataFor18Plus.push({...center, ...session});
                        }
                        if (session.min_age_limit === 45) {
                            dataFor45Plus.push({...center, ...session});
                        }
                    });
                }
            });
            if (alertFor18Plus) {
                showDataFor18Plus(dataFor18Plus, totalCenters, totalSessions);
            }
            if (alertFor45Plus) {
                showDataFor45Plus(dataFor45Plus, totalCenters, totalSessions);
            }
        }
    }
    
    let queryParam = `rand=${(+new Date())}`;
	fetchData(queryParam).then(processData);
    if (frequency > 0) {
    	cron = setInterval(() => {
        	let queryParam = `rand=${(+new Date())}`;
            fetchData(queryParam).then(processData);
        }, frequency * 1000);
    }

    $announcement.text(`Actively running Scheduler every ${frequency} seconds to check if any Vaccine slots are available on the ${searchByPinCode ? `Pincode ${pinCode}`:`District ID ${districtId}`} for ${date}. If no slots are available, a message will be shown below. If any slots open up there will be an Alert.`);
};